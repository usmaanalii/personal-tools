import { expect, it } from 'vitest'
import { helloHandler } from '../../hello/handler'

it('returns the public greeting and browser response headers for GET', async () => {
  const response = helloHandler(new Request('https://example.com/functions/v1/hello'))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ message: 'Hello from Supabase!', ok: true })
  expect(response.headers.get('Content-Type')).toContain('application/json')
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://usmaanalii.github.io')
})

it('answers preflight with an empty response and the allowed browser contract', async () => {
  const response = helloHandler(new Request('https://example.com/functions/v1/hello', { method: 'OPTIONS' }))
  expect(response.status).toBe(204)
  expect(await response.text()).toBe('')
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://usmaanalii.github.io')
  expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
  expect(response.headers.get('Access-Control-Allow-Headers')).toBe('apikey, authorization, content-type, x-client-info')
})

it('rejects writes with the supported methods and a browser-readable JSON error', async () => {
  const response = helloHandler(new Request('https://example.com/functions/v1/hello', { method: 'POST' }))
  expect(response.status).toBe(405)
  expect(await response.json()).toEqual({ error: 'Method not allowed. Use GET.' })
  expect(response.headers.get('Allow')).toBe('GET, OPTIONS')
  expect(response.headers.get('Content-Type')).toContain('application/json')
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://usmaanalii.github.io')
})
