import { HttpResponse, http } from 'msw'
import { expect, it } from 'vitest'
import { authenticateAccountDeletion } from '../../account-deletion/authenticate'
import { accountDeletionHandler } from '../../account-deletion/handler'
import { server } from '../server'

function requestForAccount({ anonymous = false } = {}) {
  const accountId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const claims = Buffer.from(JSON.stringify({ sub: accountId, session_id: sessionId })).toString('base64url')
  const token = `eyJhbGciOiJIUzI1NiJ9.${claims}.test-signature`
  server.use(http.get('https://supabase.example/auth/v1/user', ({ request }) => {
    if (request.headers.get('authorization') !== `Bearer ${token}`) {
      return HttpResponse.json({}, { status: 401 })
    }
    return HttpResponse.json({ id: accountId, is_anonymous: anonymous })
  }))
  return {
    accountId,
    sessionId,
    request: new Request('https://supabase.example/functions/v1/account-deletion', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'confirm', intent: crypto.randomUUID() }),
    }),
  }
}

it('denies an otherwise valid bearer after its provider session is revoked', async () => {
  const { request } = requestForAccount()

  const response = await accountDeletionHandler(request, {
    authenticate: authenticateAccountDeletion({
      supabaseUrl: 'https://supabase.example',
      apiKey: 'test-publishable-key',
      sessionIsActive: async () => false,
    }),
    confirm: async () => 'deleted',
  })

  expect(response.status).toBe(401)
})

it('requires a registered account even when an anonymous session is live', async () => {
  const { request } = requestForAccount({ anonymous: true })

  const response = await accountDeletionHandler(request, {
    authenticate: authenticateAccountDeletion({
      supabaseUrl: 'https://supabase.example',
      apiKey: 'test-publishable-key',
      sessionIsActive: async () => true,
    }),
    confirm: async () => 'deleted',
  })

  expect(response.status).toBe(401)
})

it('reports an unavailable provider separately from an invalid session', async () => {
  const { request } = requestForAccount()
  server.use(http.get('https://supabase.example/auth/v1/user', () =>
    HttpResponse.json({ detail: 'private provider details' }, { status: 503 })
  ))

  const response = await accountDeletionHandler(request, {
    authenticate: authenticateAccountDeletion({
      supabaseUrl: 'https://supabase.example',
      apiKey: 'test-publishable-key',
      sessionIsActive: async () => true,
    }),
    confirm: async () => 'deleted',
  })

  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'verification_unavailable' })
})
