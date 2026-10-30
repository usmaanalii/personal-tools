import { VersesRequestSchema } from '../../../packages/api-contracts/src/quran.ts'
import { ApiErrorSchema } from '../../../packages/api-contracts/src/error.ts'
import { mapChapters, mapVerses } from './provider.ts'

type Config = { clientId: string; clientSecret: string; environment: string; origins: string[]; timeoutMs?: number }

export function createQuranHandler(config: Config) {
  const authBase = config.environment === 'production' ? 'https://oauth2.quran.foundation' : 'https://prelive-oauth2.quran.foundation'
  const apiBase = config.environment === 'production' ? 'https://apis.quran.foundation' : 'https://apis-prelive.quran.foundation'
  let windowStart = Date.now()
  let requests = 0
  let cachedToken: { value: string; expiresAt: number } | undefined
  let pendingToken: Promise<string> | undefined
  async function fetchToken(): Promise<string> {
    const auth = await fetch(`${authBase}/oauth2/token`, {
      method: 'POST',
      signal: AbortSignal.timeout(config.timeoutMs ?? 8_000),
      redirect: 'error',
      headers: { Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&scope=content',
    })
    const token: unknown = await auth.json()
    if (!auth.ok || typeof token !== 'object' || token === null || !('access_token' in token) || typeof token.access_token !== 'string' || !token.access_token || !('expires_in' in token) || typeof token.expires_in !== 'number' || !Number.isFinite(token.expires_in) || token.expires_in <= 0) throw new Error('Token request failed.')
    cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 }
    return cachedToken.value
  }
  function getToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return Promise.resolve(cachedToken.value)
    pendingToken ??= fetchToken().finally(() => { pendingToken = undefined })
    return pendingToken
  }
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') ?? ''
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'apikey, content-type', 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    const error = (message: string, status: number) => Response.json(ApiErrorSchema.parse({ error: message }), { status, headers })
    if (!config.origins.includes(origin)) return new Response(null, { status: 403 })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'GET') return error('Method not allowed.', 405)
    const url = new URL(request.url)
    const pathRoute = url.pathname.split('/quran/')[1] ?? ''
    const ownedContract = pathRoute.startsWith('v2/')
    const route = ownedContract ? pathRoute.slice(3) : pathRoute
    const chapter = url.searchParams.get('chapter') ?? ''
    const page = url.searchParams.get('page') ?? '1'
    const allowed = route === 'chapters' ? [] : ['chapter', 'page']
    if ((route !== 'chapters' && route !== 'verses') || [...url.searchParams.keys()].some(key => !allowed.includes(key) || url.searchParams.getAll(key).length !== 1)) return error('Invalid content request.', 400)
    if (route === 'verses' && (!/^[1-9]\d{0,2}$/.test(chapter) || !/^[1-9]\d?$/.test(page) || !VersesRequestSchema.safeParse({ chapter: Number(chapter), page: Number(page) }).success)) return error('Invalid chapter or page.', 400)
    if (!config.clientId || !config.clientSecret || !['prelive', 'production'].includes(config.environment)) return error('Quran content is not configured yet.', 503)
    if (Date.now() - windowStart >= 60_000) { windowStart = Date.now(); requests = 0 }
    // A bounded per-isolate budget, not a global or per-user rate limiter.
    if (++requests > 60) return Response.json(ApiErrorSchema.parse({ error: 'Too many requests. Please try again shortly.' }), { status: 429, headers: { ...headers, 'Retry-After': '60' } })
    const translationId = config.environment === 'prelive' ? 85 : 131
    const path = route === 'chapters' ? 'chapters?language=en' : `verses/by_chapter/${chapter}?fields=text_uthmani&translations=${translationId}&per_page=20&page=${page}`
    try {
      const read = async (token: string) => fetch(`${apiBase}/content/api/v4/${path}`, { signal: AbortSignal.timeout(config.timeoutMs ?? 8_000), redirect: 'error', headers: { 'x-auth-token': token, 'x-client-id': config.clientId } })
      const token = await getToken()
      let response = await read(token)
      if (response.status === 401) {
        // Do not invalidate a newer token acquired by a simultaneous request.
        if (cachedToken?.value === token) cachedToken = undefined
        response = await read(await getToken())
      }
      if (!response.ok) return error('Quran content is temporarily unavailable. Please try again.', response.status === 429 ? 429 : 502)
      const payload: unknown = await response.json()
      const content = ownedContract
        ? route === 'chapters' ? mapChapters(payload) : mapVerses(payload, translationId, Number(page))
        : payload
      return Response.json(content, { headers })
    } catch {
      return error('Quran content is temporarily unavailable. Please try again.', 502)
    }
  }
}
