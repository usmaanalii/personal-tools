import { type NextRequest, NextResponse } from 'next/server'
import { createProvider, getAuthOrigin } from '../provider'

export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  const origin = getAuthOrigin()
  if (!origin || request.headers.get('origin') !== origin) {
    return new NextResponse(null, { status: 403, headers })
  }

  const cookies = new NextResponse()
  const provider = createProvider(request.cookies, cookies)
  if (!provider) return new NextResponse(null, { status: 503, headers })

  const { data, error } = await provider.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: new URL('/auth/callback', origin).href },
  })
  if (error) return new NextResponse(null, { status: 502, headers })

  const response = NextResponse.json({ url: data.url }, { headers })
  for (const cookie of cookies.cookies.getAll()) response.cookies.set(cookie)
  return response
}
