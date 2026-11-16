import { type NextRequest, NextResponse } from 'next/server'
import {
  accessCookie,
  createProvider,
  getAuthOrigin,
  refreshCookie,
  writeSession,
} from './app/auth/provider'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('cache-control', 'private, no-store')

  const token = request.cookies.get(refreshCookie)?.value
  const origin = getAuthOrigin()
  if (!origin || !token || request.cookies.has(accessCookie)) return response

  const provider = createProvider(request.cookies)
  if (!provider) return response

  const { data, error } = await provider.refreshSession({
    refresh_token: token,
  })
  if (error || !writeSession(response, origin, data.session)) return response

  const rotated = response.cookies.getAll()
  rotated.forEach((cookie) => {
    request.cookies.set(cookie.name, cookie.value)
  })
  const forwarded = NextResponse.next({ request: { headers: request.headers } })
  rotated.forEach((cookie) => {
    forwarded.cookies.set(cookie)
  })
  forwarded.headers.set('cache-control', 'private, no-store')
  return forwarded
}

export const config = { matcher: '/' }
