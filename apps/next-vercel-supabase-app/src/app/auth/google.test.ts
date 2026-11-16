import { createHash } from 'node:crypto'
import { http, HttpResponse } from 'msw'
import { NextRequest } from 'next/server'
import { expect, it, vi } from 'vitest'
import { proxy } from '../../proxy'
import { server } from '../../test/server'
import { GET as callback } from './callback/route'
import { POST } from './sign-in/route'
import { POST as signOut } from './sign-out/route'
import { readSession } from './session'

const site = 'https://lab.example.test'
const provider = 'https://project.supabase.co'

function configureAuth() {
  vi.stubEnv('AUTH_ORIGIN', site)
  vi.stubEnv('SUPABASE_URL', provider)
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture')
}

it('withholds identity when Supabase rejects a forged access cookie', async () => {
  configureAuth()
  server.use(
    http.get(`${provider}/auth/v1/user`, () => {
      return HttpResponse.json({ code: 'bad_jwt' }, { status: 401 })
    }),
  )
  const { cookies } = new NextRequest(site, {
    headers: { cookie: 'next-lab-access=forged-token' },
  })
  await expect(readSession(cookies)).resolves.toEqual({ status: 'guest' })
})

it('rejects cross-origin changes without setting cookies', async () => {
  configureAuth()
  const [start, end] = await Promise.all([
    POST(
      new NextRequest(`${site}/auth/sign-in`, {
        method: 'POST',
        headers: { origin: 'https://attacker.test' },
      }),
    ),
    signOut(
      new NextRequest(`${site}/auth/sign-out`, {
        method: 'POST',
        headers: { origin: 'https://attacker.test' },
      }),
    ),
  ])
  expect(start.status).toBe(403)
  expect(end.status).toBe(403)
  expect(start.headers.getSetCookie()).toEqual([])
  expect(end.headers.getSetCookie()).toEqual([])
})

it('keeps sign-in disabled when deployed over a non-loopback HTTP origin', async () => {
  configureAuth()
  const insecureOrigin = 'http://lab.example.test'
  vi.stubEnv('AUTH_ORIGIN', insecureOrigin)
  const response = await POST(
    new NextRequest(`${insecureOrigin}/auth/sign-in`, {
      method: 'POST',
      headers: { origin: insecureOrigin },
    }),
  )
  expect(response.status).toBe(403)
  expect(response.headers.getSetCookie()).toEqual([])
})

it('returns a denied Google callback to the account section without provider details', async () => {
  configureAuth()
  const response = await callback(
    new NextRequest(
      `${site}/auth/callback?error=access_denied&error_description=private`,
      { headers: { cookie: 'next-lab-pkce=old-verifier' } },
    ),
  )
  expect(response.headers.get('location')).toBe(`${site}/?auth=denied#account`)
  expect(response.headers.getSetCookie()).toEqual([
    expect.stringMatching(/next-lab-pkce=;.*Max-Age=0/i),
  ])
})

it('starts Google sign-in with a private proof key and a fixed callback', async () => {
  configureAuth()
  const response = await POST(
    new NextRequest(`${site}/auth/sign-in?next=https://attacker.test`, {
      method: 'POST',
      headers: { origin: site },
    }),
  )
  expect(response.status).toBe(200)
  const { url } = await response.json()
  const redirect = new URL(url)
  expect(redirect.origin + redirect.pathname).toBe(
    `${provider}/auth/v1/authorize`,
  )
  expect(redirect.searchParams.get('provider')).toBe('google')
  expect(redirect.searchParams.get('redirect_to')).toBe(`${site}/auth/callback`)
  expect(redirect.searchParams.get('code_challenge_method')).toBe('s256')
  expect(redirect.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/)
  expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/i)
  expect(response.headers.get('set-cookie')).toMatch(/SameSite=lax/i)
  expect(response.headers.get('set-cookie')).toMatch(/Secure/i)
})

it('signs out only the current session and removes both cookies', async () => {
  configureAuth()
  server.use(
    http.post(`${provider}/auth/v1/logout`, ({ request }) => {
      expect(new URL(request.url).searchParams.get('scope')).toBe('local')
      expect(request.headers.get('authorization')).toBe(
        'Bearer provider-access',
      )
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const response = await signOut(
    new NextRequest(`${site}/auth/sign-out`, {
      method: 'POST',
      headers: {
        origin: site,
        cookie:
          'next-lab-access=provider-access; next-lab-refresh=provider-refresh',
      },
    }),
  )
  expect(response.status).toBe(204)
  expect(response.headers.getSetCookie()).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/next-lab-access=;.*Max-Age=0/i),
      expect.stringMatching(/next-lab-refresh=;.*Max-Age=0/i),
    ]),
  )
})

it('revokes the current session even if its access cookie just expired', async () => {
  configureAuth()
  const requests: string[] = []
  server.use(
    http.post(`${provider}/auth/v1/token`, () => {
      requests.push('refresh')
      return HttpResponse.json({
        access_token: 'renewed-access',
        refresh_token: 'renewed-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'verified-account' },
      })
    }),
    http.post(`${provider}/auth/v1/logout`, ({ request }) => {
      requests.push('logout')
      expect(request.headers.get('authorization')).toBe('Bearer renewed-access')
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const response = await signOut(
    new NextRequest(`${site}/auth/sign-out`, {
      method: 'POST',
      headers: { origin: site, cookie: 'next-lab-refresh=provider-refresh' },
    }),
  )
  expect(response.status).toBe(204)
  expect(requests).toEqual(['refresh', 'logout'])
})

it('rotates the cookies when the access cookie expires and forwards the new session to the page', async () => {
  configureAuth()
  server.use(
    http.post(`${provider}/auth/v1/token`, async ({ request }) => {
      expect(new URL(request.url).searchParams.get('grant_type')).toBe(
        'refresh_token',
      )
      expect(await request.json()).toEqual({
        refresh_token: 'provider-refresh',
      })
      return HttpResponse.json({
        access_token: 'renewed-access',
        refresh_token: 'renewed-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'verified-account' },
      })
    }),
  )
  const response = await proxy(
    new NextRequest(site, {
      headers: { cookie: 'next-lab-refresh=provider-refresh' },
    }),
  )
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(response.cookies.get('next-lab-access')?.value).toBe('renewed-access')
  expect(response.cookies.get('next-lab-refresh')?.value).toBe(
    'renewed-refresh',
  )
  expect(response.headers.get('x-middleware-request-cookie')).toContain(
    'next-lab-access=renewed-access',
  )
})

it('renders only the account verified by Supabase for the current request', async () => {
  configureAuth()
  server.use(
    http.get(`${provider}/auth/v1/user`, ({ request }) => {
      expect(request.headers.get('authorization')).toBe(
        'Bearer provider-access',
      )
      expect(request.headers.get('cache-control')).toBe('no-cache')
      return HttpResponse.json({
        id: 'verified-account',
        email: 'reader@example.test',
        user_metadata: { private: 'never passed to the client' },
      })
    }),
  )
  const { cookies } = new NextRequest(site, {
    headers: { cookie: 'next-lab-access=provider-access' },
  })
  await expect(readSession(cookies)).resolves.toEqual({
    status: 'authenticated',
    identity: { id: 'verified-account', label: 'reader@example.test' },
  })
})

it('exchanges a Google callback with its proof key and sets private session cookies', async () => {
  configureAuth()
  const started = await POST(
    new NextRequest(`${site}/auth/sign-in`, {
      method: 'POST',
      headers: { origin: site },
    }),
  )
  const { url } = await started.json()
  const challenge = new URL(url).searchParams.get('code_challenge')
  server.use(
    http.post(`${provider}/auth/v1/token`, async ({ request }) => {
      const body = await request.json()
      expect(new URL(request.url).searchParams.get('grant_type')).toBe('pkce')
      expect(body).toMatchObject({ auth_code: 'google-return-code' })
      const verifier = (body as { code_verifier: string }).code_verifier
      expect(createHash('sha256').update(verifier).digest('base64url')).toBe(
        challenge,
      )
      return HttpResponse.json({
        access_token: 'provider-access',
        refresh_token: 'provider-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'verified-account', email: 'reader@example.test' },
      })
    }),
  )

  const response = await callback(
    new NextRequest(
      site +
        '/auth/callback?code=google-return-code&next=https://attacker.test',
      {
        headers: {
          cookie: started.headers.get('set-cookie')?.split(';')[0] ?? '',
        },
      },
    ),
  )

  expect(response.headers.get('location')).toBe(`${site}/#account`)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  const cookies = response.headers.getSetCookie()
  const sessionCookies = cookies.filter((cookie) =>
    /provider-(access|refresh)/.test(cookie),
  )
  expect(sessionCookies).toHaveLength(2)
  expect(
    sessionCookies.every(
      (cookie) => /HttpOnly/i.test(cookie) && /Secure/i.test(cookie),
    ),
  ).toBe(true)
  expect(cookies).toContainEqual(
    expect.stringMatching(/next-lab-pkce=;.*Max-Age=0/i),
  )
})
