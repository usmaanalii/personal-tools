import { type NextRequest, NextResponse } from 'next/server'
import {
  clearVerifier,
  createProvider,
  getAuthOrigin,
  writeSession,
} from '../provider'

export async function GET(request: NextRequest) {
  const origin = getAuthOrigin()
  const headers = {
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
  }
  if (!origin) return new NextResponse(null, { status: 503, headers })

  const query = request.nextUrl.searchParams
  const denied = query.get('error') === 'access_denied'
  const expired = query.get('error_code') === 'otp_expired'
  const home = new URL('/#account', origin)
  home.searchParams.set(
    'auth',
    expired ? 'link-expired' : denied ? 'denied' : 'failed',
  )
  const response = new NextResponse(null, { status: 303, headers })
  response.headers.set('location', home.href)
  if (query.has('error') || expired || !query.has('code')) {
    clearVerifier(response, origin)
    return response
  }
  const provider = createProvider(request.cookies, response)
  const code = query.get('code')
  if (!provider || !code) return response

  const { data, error } = await provider.exchangeCodeForSession(code)
  if (!error && writeSession(response, origin, data.session)) {
    home.search = ''
    response.headers.set('location', home.href)
  }
  return response
}
