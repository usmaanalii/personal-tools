import { HttpResponse, http } from 'msw'
import { expect, it } from 'vitest'
import { confirmAccountDeletion } from '../../account-deletion/confirm'
import { accountDeletionHandler } from '../../account-deletion/handler'
import { server } from '../server'

function confirmation() {
  const actor = { accountId: crypto.randomUUID(), sessionId: crypto.randomUUID() }
  const intent = crypto.randomUUID()
  const request = () => new Request('https://supabase.example/functions/v1/account-deletion', {
    method: 'POST',
    headers: { authorization: 'Bearer test-session' },
    body: JSON.stringify({ action: 'confirm', intent }),
  })
  return { actor, intent, request }
}

it('hard-deletes the confirmed account after claiming its verified intent', async () => {
  const { actor, intent, request } = confirmation()
  const accounts = new Set([actor.accountId, crypto.randomUUID()])
  server.use(http.delete('https://supabase.example/auth/v1/admin/users/:id', async ({ params, request }) => {
    if (
      request.headers.get('authorization') !== 'Bearer service-role' ||
      (await request.json() as { should_soft_delete?: boolean }).should_soft_delete !== false ||
      typeof params.id !== 'string' ||
      !accounts.delete(params.id)
    ) return new HttpResponse(null, { status: 403 })
    return HttpResponse.json({})
  }))

  const response = await accountDeletionHandler(request(), {
    authenticate: async () => actor,
    confirm: confirmAccountDeletion({
      supabaseUrl: 'https://supabase.example',
      serviceRoleKey: 'service-role',
      claim: async (session, candidate) =>
        session.accountId === actor.accountId &&
        session.sessionId === actor.sessionId &&
        candidate === intent ? 'claimed' : 'invalid_intent',
    }),
  })

  expect(response.status).toBe(204)
  expect(accounts.has(actor.accountId)).toBe(false)
  expect(accounts.size).toBe(1)
})

it('keeps an ambiguous provider outcome pending across repeated confirmation', async () => {
  const { actor, request } = confirmation()
  const providerRequests: string[] = []
  server.use(http.delete('https://supabase.example/auth/v1/admin/users/:id', ({ request }) => {
    providerRequests.push(request.url)
    return HttpResponse.error()
  }))
  const claimed = new Set<string>()
  const dependencies = {
    authenticate: async () => actor,
    confirm: confirmAccountDeletion({
      supabaseUrl: 'https://supabase.example',
      serviceRoleKey: 'service-role',
      claim: async (_session, intent) => {
        if (claimed.has(intent)) return 'pending'
        claimed.add(intent)
        return 'claimed'
      },
    }),
  }

  const first = await accountDeletionHandler(request(), dependencies)
  const repeated = await accountDeletionHandler(request(), dependencies)

  expect(first.status).toBe(202)
  expect(repeated.status).toBe(202)
  expect(providerRequests).toHaveLength(1)
})
