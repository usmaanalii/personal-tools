import { afterEach, describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../server'
import { createQuranHandler } from '../../quran/handler'

const origin = 'https://usmaanalii.github.io'
function setup() {
  return createQuranHandler({ clientId: 'test-client', clientSecret: 'test-secret', environment: 'prelive', origins: [origin] })
}
function request(path = 'chapters', method = 'GET', requestOrigin = origin) {
  return new Request(`https://example.com/functions/v1/quran/${path}`, { method, headers: { Origin: requestOrigin } })
}
function upstream() {
  server.use(
    http.post('https://prelive-oauth2.quran.foundation/oauth2/token', () => HttpResponse.json({ access_token: 'private-token', expires_in: 3600 })),
    http.get('https://apis-prelive.quran.foundation/content/api/v4/chapters', ({ request }) => {
      expect(request.headers.get('x-auth-token')).toBe('private-token')
      return HttpResponse.json({ chapters: [{ id: 1 }] })
    }),
  )
}
afterEach(() => vi.useRealTimers())
describe('Quran content proxy', () => {
  it('shares a token across simultaneous content requests and renews it near expiry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    let tokens = 0
    server.use(
      http.post('https://prelive-oauth2.quran.foundation/oauth2/token', () => { tokens++; return HttpResponse.json({ access_token: 'private-token', expires_in: 3600 }) }),
      http.get('https://apis-prelive.quran.foundation/content/api/v4/chapters', () => HttpResponse.json({ chapters: [{ id: 1 }] })),
    )
    const handler = setup()
    await Promise.all([handler(request()), handler(request())])
    expect(tokens).toBe(1)
    vi.setSystemTime(Date.now() + 3_571_000)
    expect((await handler(request())).status).toBe(200)
    expect(tokens).toBe(2)
  })

  it('rejects requests outside the read-only content contract before calling upstream', async () => {
    upstream()
    const handler = setup()
    expect((await handler(request('chapters', 'POST'))).status).toBe(405)
    expect((await handler(request('chapters', 'GET', 'https://untrusted.example'))).status).toBe(403)
    expect((await handler(request('https://untrusted.example'))).status).toBe(400)
    expect((await handler(request('verses?chapter=115'))).status).toBe(400)
    expect((await handler(request('verses?chapter=1&page=999'))).status).toBe(400)
    expect((await handler(request('chapters?url=https://untrusted.example'))).status).toBe(400)
    expect((await handler(request('chapters', 'OPTIONS'))).status).toBe(204)
    const unconfigured = createQuranHandler({ clientId: '', clientSecret: '', environment: 'invalid', origins: [origin] })
    expect((await unconfigured(request())).status).toBe(503)
  })

  it('renews an invalid token once and returns a safe error if the retry also fails', async () => {
    let tokens = 0
    let calls = 0
    server.use(
      http.post('https://prelive-oauth2.quran.foundation/oauth2/token', () => { tokens++; return HttpResponse.json({ access_token: `token-${tokens}`, expires_in: 3600 }) }),
      http.get('https://apis-prelive.quran.foundation/content/api/v4/chapters', () => { calls++; return HttpResponse.json({ error: 'upstream private detail' }, { status: 401 }) }),
    )
    const response = await setup()(request())
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('private detail')
    expect(tokens).toBe(2)
    expect(calls).toBe(2)
  })
  it('returns a safe error when token acquisition times out', async () => {
    server.use(http.post('https://prelive-oauth2.quran.foundation/oauth2/token', async () => {
      await delay(100)
      return HttpResponse.json({ access_token: 'late-token', expires_in: 3600 })
    }))
    const handler = createQuranHandler({ clientId: 'test-client', clientSecret: 'test-secret', environment: 'prelive', origins: [origin], timeoutMs: 5 })
    expect((await handler(request())).status).toBe(502)
  })
  it('requests the English translation available in pre-live', async () => {
    upstream()
    let translationId = ''
    server.use(http.get('https://apis-prelive.quran.foundation/content/api/v4/verses/by_chapter/1', ({ request }) => {
      translationId = new URL(request.url).searchParams.get('translations') ?? ''
      return HttpResponse.json({ verses: [] })
    }))
    expect((await setup()(request('verses?chapter=1'))).status).toBe(200)
    expect(translationId).toBe('85')
  })
  it('keeps the selected production translation when using production credentials', async () => {
    let translationId = ''
    server.use(
      http.post('https://oauth2.quran.foundation/oauth2/token', () => HttpResponse.json({ access_token: 'production-token', expires_in: 3600 })),
      http.get('https://apis.quran.foundation/content/api/v4/verses/by_chapter/1', ({ request }) => {
        translationId = new URL(request.url).searchParams.get('translations') ?? ''
        return HttpResponse.json({ verses: [] })
      }),
    )
    const handler = createQuranHandler({ clientId: 'production-client', clientSecret: 'production-secret', environment: 'production', origins: [origin] })
    expect((await handler(request('verses?chapter=1'))).status).toBe(200)
    expect(translationId).toBe('131')
  })
  it('returns chapter content without exposing credentials or tokens', async () => {
    upstream()
    const response = await setup()(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ chapters: [{ id: 1 }] })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  })
})

describe('Quran API recovery and request contracts', () => {
  it.each([
    null,
    {},
    { access_token: '', expires_in: 3600 },
    { access_token: 42, expires_in: 3600 },
    { access_token: 'private-token' },
    { access_token: 'private-token', expires_in: 0 },
    { access_token: 'private-token', expires_in: -1 },
    { access_token: 'private-token', expires_in: '3600' },
  ])('rejects malformed token payload case %# without requesting content', async payload => {
    let contentRequests = 0
    server.use(
      http.post('https://prelive-oauth2.quran.foundation/oauth2/token', () => HttpResponse.json(payload)),
      http.get('https://apis-prelive.quran.foundation/content/api/v4/chapters', () => {
        contentRequests++
        return HttpResponse.json({ chapters: [] })
      }),
    )
    const response = await setup()(request())
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'Quran content is temporarily unavailable. Please try again.' })
    expect(contentRequests).toBe(0)
  })

  it('recovers on a later request after token acquisition fails', async () => {
    upstream()
    server.use(http.post('https://prelive-oauth2.quran.foundation/oauth2/token', () => new HttpResponse('private auth failure', { status: 500 })))
    const handler = setup()
    const failed = await handler(request())
    expect(failed.status).toBe(502)
    expect(await failed.text()).not.toContain('private auth failure')
    server.use(http.post('https://prelive-oauth2.quran.foundation/oauth2/token', () => HttpResponse.json({ access_token: 'private-token', expires_in: 3600 })))
    const recovered = await handler(request())
    expect(recovered.status).toBe(200)
    expect(await recovered.json()).toEqual({ chapters: [{ id: 1 }] })
  })

  it('retries rejected content with a fresh token and returns the recovered content', async () => {
    let tokens = 0
    server.use(
      http.post('https://prelive-oauth2.quran.foundation/oauth2/token', () => {
        tokens++
        return HttpResponse.json({ access_token: tokens === 1 ? 'stale-token' : 'fresh-token', expires_in: 3600 })
      }),
      http.get('https://apis-prelive.quran.foundation/content/api/v4/chapters', ({ request }) =>
        request.headers.get('x-auth-token') === 'fresh-token'
          ? HttpResponse.json({ chapters: [{ id: 2 }] })
          : new HttpResponse(null, { status: 401 }),
      ),
    )
    const response = await setup()(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ chapters: [{ id: 2 }] })
    expect(tokens).toBe(2)
  })

  it('forwards the requested verse page with bounded page size and translation', async () => {
    upstream()
    let requestedUrl: URL | undefined
    const content = { verses: [{ verse_number: 41 }], pagination: { next_page: 4 } }
    server.use(http.get('https://apis-prelive.quran.foundation/content/api/v4/verses/by_chapter/2', ({ request }) => {
      requestedUrl = new URL(request.url)
      return HttpResponse.json(content)
    }))
    const response = await setup()(request('verses?chapter=2&page=3'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(content)
    expect(Object.fromEntries(requestedUrl?.searchParams ?? [])).toEqual({ fields: 'text_uthmani', translations: '85', per_page: '20', page: '3' })
  })

  it('rejects requests after the budget is exhausted and resets exactly at the next minute', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(0)
    upstream()
    const handler = setup()
    for (let i = 0; i < 60; i++) expect((await handler(request())).status).toBe(200)
    const limited = await handler(request())
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBe('60')
    vi.setSystemTime(59_999)
    expect((await handler(request())).status).toBe(429)
    vi.setSystemTime(60_000)
    expect((await handler(request())).status).toBe(200)
  })
})

describe('Quran upstream response contracts', () => {
  it.each([429, 503])('returns a safe response for upstream HTTP %i', async status => {
    upstream()
    server.use(http.get('https://apis-prelive.quran.foundation/content/api/v4/chapters', () => new HttpResponse('private upstream detail', { status })))
    const response = await setup()(request())
    expect(response.status).toBe(status === 429 ? 429 : 502)
    expect(await response.json()).toEqual({ error: 'Quran content is temporarily unavailable. Please try again.' })
  })

  it('returns a safe error when upstream content is not JSON', async () => {
    upstream()
    server.use(http.get('https://apis-prelive.quran.foundation/content/api/v4/chapters', () => new HttpResponse('invalid private content')))
    const response = await setup()(request())
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('invalid private content')
  })

  it('rejects a request with no Origin header', async () => {
    const response = await setup()(new Request('https://example.com/functions/v1/quran/chapters'))
    expect(response.status).toBe(403)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
