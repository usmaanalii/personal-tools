import { afterEach, describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../test-server'
import { createQuranHandler } from '../../../../../supabase/functions/quran/handler'

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
  it('bounds upstream work with a request budget and timeout', async () => {
    upstream()
    const handler = setup()
    for (let i = 0; i < 60; i++) expect((await handler(request())).status).toBe(200)
    const limited = await handler(request())
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBe('60')
    server.use(http.post('https://prelive-oauth2.quran.foundation/oauth2/token', async () => { await delay(100); return HttpResponse.json({ access_token: 'late-token', expires_in: 3600 }) }))
    const timed = createQuranHandler({ clientId: 'test-client', clientSecret: 'test-secret', environment: 'prelive', origins: [origin], timeoutMs: 5 })
    expect((await timed(request())).status).toBe(502)
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
