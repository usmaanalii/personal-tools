import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createProvider, getAuthOrigin } from '../provider'

const linkRequest = z.object({ email: z.email() })

export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  const origin = getAuthOrigin()
  if (!origin || request.headers.get('origin') !== origin) {
    return new NextResponse(null, { status: 403, headers })
  }

  const input = linkRequest.safeParse(
    await request.json().catch(() => undefined),
  )
  if (!input.success) return new NextResponse(null, { status: 400, headers })

  const response = new NextResponse(null, { status: 204, headers })
  const provider = createProvider(request.cookies, response)
  if (!provider) return new NextResponse(null, { status: 503, headers })

  const { error } = await provider.signInWithOtp({
    email: input.data.email,
    options: { emailRedirectTo: new URL('/auth/callback', origin).href },
  })
  if (error) {
    return new NextResponse(null, {
      status: error.status === 429 ? 429 : 502,
      headers,
    })
  }
  return response
}
