import { HttpResponse, http } from 'msw'
import { expect, it } from 'vitest'
import { createAccountDeletionEndpoint } from '../../account-deletion/endpoint'
import { server } from '../server'

it('deletes through the provider only after the verified session claims its stored intent', async () => {
  const account = crypto.randomUUID()
  const session = crypto.randomUUID()
  const intent = crypto.randomUUID()
  const claims = Buffer.from(JSON.stringify({ sub: account, session_id: session })).toString('base64url')
  const token = `header.${claims}.signature`
  const supabaseUrl = 'https://supabase.example'
  const auth = 'Bearer service-role'
  const accounts = new Set([account])

  server.use(
    http.get(`${supabaseUrl}/auth/v1/user`, ({ request }) =>
      request.headers.get('authorization') === `Bearer ${token}`
        ? HttpResponse.json({ id: account })
        : new HttpResponse(null, { status: 401 })
    ),
    http.post(`${supabaseUrl}/rest/v1/rpc/account_deletion_session_active`, async ({ request }) => {
      const body = await request.json() as { account?: string; session?: string }
      return HttpResponse.json(request.headers.get('authorization') === auth &&
        body.account === account && body.session === session)
    }),
    http.post(`${supabaseUrl}/rest/v1/rpc/claim_account_deletion`, async ({ request }) => {
      const body = await request.json() as { account?: string; session?: string; intent?: string }
      return HttpResponse.json(request.headers.get('authorization') === auth &&
        body.account === account && body.session === session && body.intent === intent
        ? 'claimed' : 'invalid_intent')
    }),
    http.delete(`${supabaseUrl}/auth/v1/admin/users/:id`, ({ params, request }) =>
      request.headers.get('authorization') === auth && typeof params.id === 'string' && accounts.delete(params.id)
        ? HttpResponse.json({})
        : new HttpResponse(null, { status: 403 })
    ),
  )
  const endpoint = createAccountDeletionEndpoint({
    supabaseUrl, publicKey: 'publishable-key', serviceRoleKey: 'service-role',
  })
  const response = await endpoint(new Request(`${supabaseUrl}/functions/v1/account-deletion`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'confirm', intent }),
  }))

  expect(response.status).toBe(204)
  expect(accounts.has(account)).toBe(false)
})
