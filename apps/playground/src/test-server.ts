import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { getSupabaseConfig } from './config'

const { supabaseUrl } = getSupabaseConfig()
export const helloEndpoint = `${supabaseUrl}/functions/v1/hello`

export const server = setupServer(
  http.get(helloEndpoint, () =>
    HttpResponse.json({ message: 'Hello from Supabase!', ok: true }),
  ),
)
