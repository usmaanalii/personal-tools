import { afterEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test-server'
import { createSupabaseAuth } from './supabase-auth'
import type { Session } from '@scratch-pages/auth'

const config = {
  supabaseUrl: 'https://auth.example',
  supabasePublishableKey: 'fixture-key',
  redirectTo: new URL('/app/account/', window.location.origin).href,
}
const accountId = 'cde32903-8a24-4ade-9c2c-9c31cdee3a91'

function tokenResponse() {
  return HttpResponse.json({
    access_token: 'access-fixture',
    refresh_token: 'refresh-fixture',
    expires_in: 3600,
    user: { id: accountId, email: 'reader@example.test' },
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
  localStorage.clear()
})

it('leaves the reader in place when starting sign-in offline', async () => {
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
  const navigate = vi.fn()
  const auth = createSupabaseAuth({ ...config, navigate })

  await expect(auth.signIn()).rejects.toThrow('Could not start sign-in.')
  expect(navigate).not.toHaveBeenCalled()
})

it('does not start OAuth when the browser cannot generate an S256 challenge', async () => {
  vi.stubGlobal('crypto', { getRandomValues: window.crypto.getRandomValues.bind(window.crypto) })
  const navigate = vi.fn()
  const auth = createSupabaseAuth({ ...config, navigate })

  await expect(auth.signIn()).rejects.toThrow('Could not start sign-in.')
  expect(navigate).not.toHaveBeenCalled()
})

it('starts Google PKCE with the app-supplied destination despite an incoming redirect parameter', async () => {
  const navigate = vi.fn<(url: string) => void>()
  window.history.replaceState({}, '', '/personal-tools/quran/?next=https://outside.example')
  const auth = createSupabaseAuth({
    ...config,
    navigate,
  })

  await auth.signIn()

  const [redirect] = navigate.mock.calls[0] ?? []
  if (!redirect) throw new Error('The browser did not receive an authorization URL.')
  const url = new URL(redirect)
  expect(url.origin + url.pathname).toBe('https://auth.example/auth/v1/authorize')
  expect(url.searchParams.get('provider')).toBe('google')
  expect(url.searchParams.get('redirect_to')).toBe(config.redirectTo)
  expect(url.searchParams.get('code_challenge_method')).toBe('s256')
})

it('requests a magic link with PKCE for the configured reader destination', async () => {
  const delivered = vi.fn()
  server.use(http.post(`${config.supabaseUrl}/auth/v1/otp`, async ({ request }) => {
    delivered(new URL(request.url).searchParams.get('redirect_to'), await request.json())
    return HttpResponse.json({})
  }))
  window.history.replaceState({}, '', '/personal-tools/quran/?next=https://outside.example')
  const auth = createSupabaseAuth(config)

  await expect(auth.requestEmailLink('reader@example.test')).resolves.toBe('accepted')

  expect(delivered).toHaveBeenCalledExactlyOnceWith(config.redirectTo, expect.objectContaining({
    email: 'reader@example.test',
    code_challenge: expect.stringMatching(/^[\w-]{43}$/),
    code_challenge_method: 's256',
  }))
})

it('reports throttling without exposing the email provider response', async () => {
  server.use(http.post(`${config.supabaseUrl}/auth/v1/otp`, () =>
    HttpResponse.json({ code: 'over_email_send_rate_limit', msg: 'private' }, { status: 429 }),
  ))
  const auth = createSupabaseAuth(config)
  await expect(auth.requestEmailLink('reader@example.test')).resolves.toBe('rate-limited')
})

it('does not send a link with a plain proof key when S256 is unavailable', async () => {
  vi.stubGlobal('crypto', { getRandomValues: window.crypto.getRandomValues.bind(window.crypto) })
  const send = vi.fn()
  server.use(http.post(`${config.supabaseUrl}/auth/v1/otp`, () => {
    send()
    return HttpResponse.json({})
  }))
  await expect(createSupabaseAuth(config).requestEmailLink('reader@example.test')).rejects.toThrow('Could not request an email sign-in link.')
  expect(send).not.toHaveBeenCalled()
})

it('exchanges a callback once, with the code removed from the URL before the request', async () => {
  const tokenRequest = vi.fn()
  server.use(http.post(`${config.supabaseUrl}/auth/v1/token`, async ({ request }) => {
    tokenRequest(window.location.search, await request.json())
    return tokenResponse()
  }))
  const outbound = createSupabaseAuth({ ...config, navigate: () => {} })
  await outbound.signIn()
  window.history.replaceState({}, '', '/personal-tools/quran/?code=callback-fixture')
  const returning = createSupabaseAuth(config)

  expect(await returning.callback).toBe('complete')
  const sessions = vi.fn()
  const unsubscribe = returning.observeSession(sessions)
  await vi.waitFor(() => expect(sessions).toHaveBeenLastCalledWith({
    status: 'authenticated',
    identity: { id: accountId, label: 'reader@example.test' },
  }))
  expect(tokenRequest).toHaveBeenCalledExactlyOnceWith('', {
    auth_code: 'callback-fixture',
    code_verifier: expect.any(String),
  })
  unsubscribe()
})

it('cleans a denied callback and never exchanges the accompanying code', async () => {
  const tokenRequest = vi.fn()
  server.use(http.post(`${config.supabaseUrl}/auth/v1/token`, () => {
    tokenRequest()
    return HttpResponse.json({}, { status: 400 })
  }))
  const outbound = createSupabaseAuth({ ...config, navigate: () => {} })
  await outbound.signIn()
  window.history.replaceState({}, '', '/personal-tools/quran/?code=fixture&chapter=2#error=access_denied&error_description=raw')

  const returning = createSupabaseAuth(config)

  expect(await returning.callback).toBe('cancelled')
  expect(window.location.pathname + window.location.search + window.location.hash).toBe('/personal-tools/quran/?chapter=2')
  expect(tokenRequest).not.toHaveBeenCalled()
})

it('clears the browser session after revoking the current session', async () => {
  const logout = vi.fn()
  server.use(
    http.post(`${config.supabaseUrl}/auth/v1/token`, tokenResponse),
    http.post(`${config.supabaseUrl}/auth/v1/logout`, ({ request }) => {
      logout(new URL(request.url).searchParams.get('scope'), request.headers.get('authorization'))
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const outbound = createSupabaseAuth({ ...config, navigate: () => {} })
  await outbound.signIn()
  window.history.replaceState({}, '', '/personal-tools/quran/?code=fixture')
  const returning = createSupabaseAuth(config)
  expect(await returning.callback).toBe('complete')
  const sessions = vi.fn()
  const unsubscribe = returning.observeSession(sessions)
  await vi.waitFor(() => expect(sessions).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'authenticated' })))

  await returning.signOut()

  expect(logout).toHaveBeenCalledExactlyOnceWith('local', 'Bearer access-fixture')
  expect(sessions).toHaveBeenLastCalledWith({ status: 'guest' })
  unsubscribe()
})

it('stops displaying an expired identity if no refreshed session arrives', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
  server.use(http.post(`${config.supabaseUrl}/auth/v1/token`, tokenResponse))
  const outbound = createSupabaseAuth({ ...config, navigate: () => {} })
  await outbound.signIn()
  window.history.replaceState({}, '', '/personal-tools/quran/?code=fixture')
  const returning = createSupabaseAuth(config)
  expect(await returning.callback).toBe('complete')

  const initial = Promise.withResolvers<Session>()
  const sessions = vi.fn((session: Session) => initial.resolve(session))
  const unsubscribe = returning.observeSession(sessions)
  expect(await initial.promise).toMatchObject({ status: 'authenticated' })

  await vi.advanceTimersByTimeAsync(3_600_000)

  expect(sessions).toHaveBeenLastCalledWith({ status: 'guest' })
  unsubscribe()
})
