import { createHash } from 'node:crypto'
import { http, HttpResponse } from 'msw'
import { NextRequest } from 'next/server'
import { expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import { GET as callback } from './callback/route'
import { POST } from './email-link/route'

const site = 'https://lab.example.test'
const provider = 'https://project.supabase.co'

it('requests a magic link with a fixed callback and sets a private proof cookie', async () => {
  vi.stubEnv('AUTH_ORIGIN', site)
  vi.stubEnv('SUPABASE_URL', provider)
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture')
  const requestLink = vi.fn()
  server.use(
    http.post(`${provider}/auth/v1/otp`, async ({ request }) => {
      requestLink(
        new URL(request.url).searchParams.get('redirect_to'),
        await request.json(),
      )
      return HttpResponse.json({})
    }),
  )

  const response = await POST(
    new NextRequest(`${site}/auth/email-link?next=https://outside.example`, {
      method: 'POST',
      headers: { origin: site, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reader@example.test' }),
    }),
  )

  expect(response.status).toBe(204)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(response.headers.get('set-cookie')).toMatch(
    /next-lab-pkce=.+HttpOnly/i,
  )
  expect(requestLink).toHaveBeenCalledExactlyOnceWith(
    `${site}/auth/callback`,
    expect.objectContaining({
      email: 'reader@example.test',
      code_challenge: expect.stringMatching(/^[\w-]{43}$/),
      code_challenge_method: 's256',
    }),
  )
})

it('reports throttling without exposing the provider response or setting cookies', async () => {
  vi.stubEnv('AUTH_ORIGIN', site)
  vi.stubEnv('SUPABASE_URL', provider)
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture')
  server.use(
    http.post(`${provider}/auth/v1/otp`, () =>
      HttpResponse.json(
        { code: 'over_email_send_rate_limit', msg: 'private' },
        { status: 429 },
      ),
    ),
  )
  const response = await POST(
    new NextRequest(`${site}/auth/email-link`, {
      method: 'POST',
      headers: { origin: site, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reader@example.test' }),
    }),
  )
  expect(response.status).toBe(429)
  expect(await response.text()).toBe('')
  expect(response.headers.getSetCookie()).toEqual([])
})

it('returns an expired email link to the account page with a safe recovery state', async () => {
  vi.stubEnv('AUTH_ORIGIN', site)
  const response = await callback(
    new NextRequest(
      `${site}/auth/callback?error=access_denied&error_code=otp_expired&error_description=provider-details&next=https://outside.example`,
    ),
  )
  expect(response.headers.get('location')).toBe(
    `${site}/?auth=link-expired#account`,
  )
})

it('redeems the email link in the requesting browser and rejects a browser without the verifier', async () => {
  vi.stubEnv('AUTH_ORIGIN', site)
  vi.stubEnv('SUPABASE_URL', provider)
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture')
  let challenge: unknown
  server.use(
    http.post(`${provider}/auth/v1/otp`, async ({ request }) => {
      const body = (await request.json()) as { code_challenge: unknown }
      challenge = body.code_challenge
      return HttpResponse.json({})
    }),
    http.post(`${provider}/auth/v1/token`, async ({ request }) => {
      const body = (await request.json()) as { code_verifier?: string }
      const proof = createHash('sha256')
        .update(body.code_verifier ?? '')
        .digest('base64url')
      if (proof !== challenge)
        return HttpResponse.json({ code: 'bad_code_verifier' }, { status: 400 })
      return HttpResponse.json({
        access_token: 'email-access',
        refresh_token: 'email-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'verified-account', email: 'reader@example.test' },
      })
    }),
  )
  const started = await POST(
    new NextRequest(`${site}/auth/email-link`, {
      method: 'POST',
      headers: { origin: site, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reader@example.test' }),
    }),
  )
  const link = `${site}/auth/callback?code=email-code`
  const otherBrowser = await callback(new NextRequest(link))
  expect(otherBrowser.headers.get('location')).toBe(
    `${site}/?auth=failed#account`,
  )
  expect(otherBrowser.cookies.has('next-lab-access')).toBe(false)

  const originalBrowser = await callback(
    new NextRequest(link, {
      headers: {
        cookie: started.headers.get('set-cookie')?.split(';')[0] ?? '',
      },
    }),
  )
  expect(originalBrowser.headers.get('location')).toBe(`${site}/#account`)
  expect(originalBrowser.cookies.get('next-lab-access')?.httpOnly).toBe(true)
})
