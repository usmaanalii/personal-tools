import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/server'
import { GET } from './route'

describe('GET /api/supabase', () => {
  it('returns a configuration error when Supabase is not configured', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '')

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'Supabase is not configured.',
    })
  })
})

it('returns the greeting after forwarding the public key to Supabase', async () => {
  vi.stubEnv('SUPABASE_URL', 'https://demo.supabase.co')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  server.use(
    http.get('https://demo.supabase.co/functions/v1/hello', ({ request }) => {
      expect(request.headers.get('apikey')).toBe('sb_publishable_test')
      return HttpResponse.json({ ok: true, message: 'Hello from Supabase!' })
    }),
  )

  const response = await GET()

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({
    ok: true,
    message: 'Hello from Supabase!',
  })
})

it.each([
  [
    'an HTTP failure with a greeting-shaped body',
    () => HttpResponse.json({ ok: true, message: 'Hello' }, { status: 500 }),
  ],
  [
    'an upstream outage',
    () => new HttpResponse('internal details', { status: 500 }),
  ],
  [
    'an unsuccessful payload',
    () => HttpResponse.json({ ok: false, message: 'Unavailable' }),
  ],
  ['an empty greeting', () => HttpResponse.json({ ok: true, message: '' })],
  ['a malformed payload', () => HttpResponse.json({ message: 42 })],
  ['non-JSON content', () => new HttpResponse('not JSON')],
  ['a network failure', () => HttpResponse.error()],
])('returns a safe error for %s', async (_scenario, upstreamResponse) => {
  vi.stubEnv('SUPABASE_URL', 'https://demo.supabase.co')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  server.use(
    http.get('https://demo.supabase.co/functions/v1/hello', upstreamResponse),
  )

  const response = await GET()

  expect(response.status).toBe(502)
  await expect(response.json()).resolves.toEqual({
    error: 'Could not reach Supabase. Please try again.',
  })
})

it.each([
  ['the public key is missing', 'https://demo.supabase.co', ''],
  ['the URL is missing', '', 'sb_publishable_test'],
  ['the URL is invalid', 'invalid-url', 'sb_publishable_test'],
])('returns a configuration error when %s', async (_scenario, url, key) => {
  vi.stubEnv('SUPABASE_URL', url)
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', key)
  const response = await GET()
  expect(response.status).toBe(503)
  await expect(response.json()).resolves.toEqual({
    error: 'Supabase is not configured.',
  })
})
