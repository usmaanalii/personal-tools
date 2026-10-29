import { getSupabaseConfig } from './config'

export type HelloResponse = {
  message: string
  ok: boolean
}

function isHelloResponse(value: unknown): value is HelloResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string' &&
    'ok' in value &&
    typeof value.ok === 'boolean'
  )
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('error' in value)) return undefined
  return typeof value.error === 'string' ? value.error : undefined
}

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
    throw new Error(errorMessage(payload) ?? `Request failed (${response.status})`)
  }
  if (!isHelloResponse(payload)) {
    throw new Error('The API returned an unexpected response.')
  }

  return payload
}
