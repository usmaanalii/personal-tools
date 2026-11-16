import { type NextRequest, NextResponse } from 'next/server'
import {
  accessCookie,
  createProvider,
  getAuthOrigin,
  refreshCookie,
  writeSession,
} from '../provider'

export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  const origin = getAuthOrigin()
  if (!origin || request.headers.get('origin') !== origin) {
    return new NextResponse(null, { status: 403, headers })
  }

  const provider = createProvider(request.cookies)
  if (!provider) return new NextResponse(null, { status: 503, headers })

  const access = request.cookies.get(accessCookie)?.value
  const refresh = request.cookies.get(refreshCookie)?.value
  const renewal =
    !access && refresh
      ? await provider.refreshSession({ refresh_token: refresh })
      : undefined
  const refreshFailure = renewal?.error
  if (
    refreshFailure &&
    ![400, 401, 403, 404].includes(refreshFailure.status ?? 0)
  ) {
    return new NextResponse(null, { status: 502, headers })
  }

  const token = access ?? renewal?.data.session?.access_token
  if (token) {
    const { error } = await provider.admin.signOut(token, 'local')
    if (error && ![401, 403, 404].includes(error.status ?? 0)) {
      const response = new NextResponse(null, { status: 502, headers })
      if (renewal) writeSession(response, origin, renewal.data.session)
      return response
    }
  }

  const response = new NextResponse(null, { status: 204, headers })
  const options = {
    httpOnly: true,
    secure: new URL(origin).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  } as const
  response.cookies.set(accessCookie, '', options)
  response.cookies.set(refreshCookie, '', options)
  return response
}
