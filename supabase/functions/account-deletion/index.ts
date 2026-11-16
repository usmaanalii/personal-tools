import { createAccountDeletionEndpoint } from './endpoint.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const publicKey = Deno.env.get('SUPABASE_ANON_KEY')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !publicKey || !serviceRoleKey) {
  throw new Error('Account deletion requires Supabase platform credentials')
}

Deno.serve(createAccountDeletionEndpoint({
  supabaseUrl,
  publicKey,
  serviceRoleKey,
  callbacks: {
    playground: Deno.env.get('ACCOUNT_DELETION_PLAYGROUND_CALLBACK'),
    next: Deno.env.get('ACCOUNT_DELETION_NEXT_CALLBACK'),
  },
}))
