import { z } from 'zod'
import { greetingSchema } from '../../../lib/greeting'

export const dynamic = 'force-dynamic'

const configurationSchema = z.object({
  url: z.url(),
  key: z.string().min(1),
})

export async function GET() {
  const configuration = configurationSchema.safeParse({
    url: process.env['SUPABASE_URL'],
    key: process.env['SUPABASE_PUBLISHABLE_KEY'],
  })
  if (!configuration.success) {
    return Response.json(
      { error: 'Supabase is not configured.' },
      { status: 503 },
    )
  }

  try {
    const response = await fetch(
      new URL('/functions/v1/hello', configuration.data.url),
      {
        headers: { apikey: configuration.data.key, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      },
    )
    if (!response.ok) throw new Error('Upstream request failed')
    const payload: unknown = await response.json()
    return Response.json(greetingSchema.parse(payload))
  } catch {
    return Response.json(
      { error: 'Could not reach Supabase. Please try again.' },
      { status: 502 },
    )
  }
}
