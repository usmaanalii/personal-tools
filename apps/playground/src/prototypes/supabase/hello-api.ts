import { HelloResponseSchema, type HelloResponse } from '@scratch-pages/api-contracts/hello'
import { ApiErrorSchema } from '@scratch-pages/api-contracts/error'
import { getSupabaseConfig } from './config'

export async function getHello(): Promise<HelloResponse> {
  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig()
  const response = await fetch(`${supabaseUrl}/functions/v1/hello`, {
    method: 'GET',
    headers: {
      apikey: supabasePublishableKey,
      Accept: 'application/json',
    },
  })

  const payload: unknown = await response.json()
  if (!response.ok) {
    const error = ApiErrorSchema.safeParse(payload)
    throw new Error(error.success ? error.data.error : `Request failed (${response.status})`)
  }
  const result = HelloResponseSchema.safeParse(payload)
  if (!result.success) {
    throw new Error('The API returned an unexpected response.')
  }

  return result.data
}

export type { HelloResponse }
