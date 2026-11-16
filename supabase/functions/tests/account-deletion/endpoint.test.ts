import { HttpResponse, http } from 'msw'
import { expect, it } from 'vitest'
import { createAccountDeletionEndpoint } from '../../account-deletion/endpoint'
import { server } from '../server'

function signedInAccount() {
  const account = crypto.randomUUID()
  const session = crypto.randomUUID()
  const supabaseUrl = 'https://supabase.example'
  const settings = {
    supabaseUrl,
    publicKey: 'publishable-key',
    serviceRoleKey: 'service-role',
    callbacks: { playground: 'https://reader.example/quran/' },
  }
  const claims = Buffer.from(JSON.stringify({ sub: account, session_id: session })).toString('base64url')
  const token = `header.${claims}.signature`
  server.use(
    http.get(`${supabaseUrl}/auth/v1/user`, () => HttpResponse.json({ id: account })),
    http.post(`${supabaseUrl}/rest/v1/rpc/account_deletion_session_active`, () => HttpResponse.json(true)),
  )
  const request = (body: unknown) => new Request(`${supabaseUrl}/functions/v1/account-deletion`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return { account, session, settings, supabaseUrl, request }
}

it('sends a PKCE link to the provider-confirmed email and returns only the intent ID', async () => {
  const { account, session, settings, supabaseUrl, request } = signedInAccount()
  const email = 'verified@example.test'
  const reserved = new Map<string, string>()
  const delivered: string[] = []
  server.use(
    http.post(`${supabaseUrl}/rest/v1/rpc/account_deletion_proof`, async ({ request }) => {
      const body = await request.json() as Record<string, string>
      if (body.operation !== 'begin' || body.account !== account || body.session !== session) {
        return HttpResponse.json({ status: 'invalid_intent' })
      }
      reserved.set(body.intent, body.verifier)
      return HttpResponse.json({ status: 'started', email })
    }),
    http.post(`${supabaseUrl}/auth/v1/otp`, async ({ request }) => {
      const callback = new URL(new URL(request.url).searchParams.get('redirect_to') ?? 'https://invalid.example')
      const intent = callback.searchParams.get('deletion_intent') ?? ''
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(reserved.get(intent)))
      const body = await request.json()
      expect(callback.origin + callback.pathname).toBe(settings.callbacks.playground)
      expect(body).toMatchObject({
        email,
        create_user: false,
        code_challenge_method: 's256',
        code_challenge: Buffer.from(digest).toString('base64url'),
      })
      delivered.push(intent)
      return HttpResponse.json({})
    }),
  )

  const response = await createAccountDeletionEndpoint(settings)(request({ action: 'begin', app: 'playground' }))

  expect(response.status).toBe(201)
  expect(delivered).toHaveLength(1)
  expect(await response.json()).toEqual({ status: 'sent', intent: delivered[0] })
})

it('records identity proof only after revoking the separate proof session', async () => {
  const { account, session, settings, supabaseUrl, request } = signedInAccount()
  const intent = crypto.randomUUID()
  const code = crypto.randomUUID()
  const verifier = 'a'.repeat(64)
  const claims = Buffer.from(JSON.stringify({
    sub: account, session_id: crypto.randomUUID(),
  })).toString('base64url')
  const proofToken = `header.${claims}.signature`
  const activeProofSessions = new Set([proofToken])
  const verified = new Set<string>()
  server.use(
    http.post(`${supabaseUrl}/rest/v1/rpc/account_deletion_proof`, async ({ request }) => {
      const body = await request.json() as Record<string, string>
      if (body.intent !== intent || body.account !== account || body.session !== session) {
        return HttpResponse.json({ status: 'invalid_intent' })
      }
      if (body.operation === 'exchange') return HttpResponse.json({ status: 'exchange', verifier })
      if (body.operation === 'verified' && !activeProofSessions.has(proofToken)) {
        verified.add(intent)
        return HttpResponse.json({ status: 'verified' })
      }
      return HttpResponse.json({ status: 'invalid_intent' })
    }),
    http.post(`${supabaseUrl}/auth/v1/token`, async ({ request }) => {
      expect(new URL(request.url).searchParams.get('grant_type')).toBe('pkce')
      expect(await request.json()).toEqual({ auth_code: code, code_verifier: verifier })
      return HttpResponse.json({ access_token: proofToken, user: { id: account } })
    }),
    http.post(`${supabaseUrl}/auth/v1/logout`, ({ request }) => {
      const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? ''
      if (new URL(request.url).searchParams.get('scope') !== 'local' || !activeProofSessions.delete(token)) {
        return new HttpResponse(null, { status: 403 })
      }
      return new HttpResponse(null, { status: 204 })
    }),
  )

  const response = await createAccountDeletionEndpoint(settings)(request({ action: 'verify', intent, code }))

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ status: 'verified' })
  expect(verified.has(intent)).toBe(true)
})

it('lets the initiating session cancel without contacting the deletion provider', async () => {
  const { account, session, settings, supabaseUrl, request } = signedInAccount()
  const intent = crypto.randomUUID()
  const activeIntents = new Set([intent])
  server.use(http.post(`${supabaseUrl}/rest/v1/rpc/account_deletion_proof`, async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.operation === 'cancel' && body.account === account && body.session === session &&
      activeIntents.delete(body.intent)) {
      return HttpResponse.json({ status: 'cancelled' })
    }
    return HttpResponse.json({ status: 'invalid_intent' })
  }))

  const response = await createAccountDeletionEndpoint(settings)(request({ action: 'cancel', intent }))

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ status: 'cancelled' })
  expect(activeIntents.has(intent)).toBe(false)
})

it('tells the caller to wait when the account has reached its email send limit', async () => {
  const { settings, supabaseUrl, request } = signedInAccount()
  server.use(http.post(`${supabaseUrl}/rest/v1/rpc/account_deletion_proof`, () =>
    HttpResponse.json({ status: 'rate_limited' })
  ))

  const response = await createAccountDeletionEndpoint(settings)(request({ action: 'begin', app: 'playground' }))

  expect(response.status).toBe(429)
  expect(await response.json()).toEqual({ error: 'rate_limited' })
})

it('reports the pending deletion when cancellation arrives after confirmation claimed it', async () => {
  const { settings, supabaseUrl, request } = signedInAccount()
  server.use(http.post(`${supabaseUrl}/rest/v1/rpc/account_deletion_proof`, () =>
    HttpResponse.json({ status: 'pending' })
  ))

  const response = await createAccountDeletionEndpoint(settings)(request({ action: 'cancel', intent: crypto.randomUUID() }))

  expect(response.status).toBe(202)
  expect(await response.json()).toEqual({ status: 'pending' })
})

it('allows the configured reader origin to send the bearer on browser requests', async () => {
  const { settings, supabaseUrl } = signedInAccount()
  const endpoint = createAccountDeletionEndpoint(settings)
  const response = await endpoint(new Request(`${supabaseUrl}/functions/v1/account-deletion`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://reader.example',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization,content-type',
    },
  }))

  expect(response.status).toBe(204)
  expect(response.headers.get('access-control-allow-origin')).toBe('https://reader.example')
  expect(response.headers.get('access-control-allow-headers')).toContain('authorization')
})

it('rejects a callback whose exchange returns a different account', async () => {
  const { settings, supabaseUrl, request } = signedInAccount()
  const other = crypto.randomUUID()
  const claims = Buffer.from(JSON.stringify({ sub: other, session_id: crypto.randomUUID() })).toString('base64url')
  const proofToken = `header.${claims}.signature`
  const temporarySessions = new Set([proofToken])
  server.use(
    http.post(`${supabaseUrl}/rest/v1/rpc/account_deletion_proof`, async ({ request }) => {
      const body = await request.json() as Record<string, string>
      expect(body.operation).toBe('exchange')
      return HttpResponse.json({ status: 'exchange', verifier: 'a'.repeat(64) })
    }),
    http.post(`${supabaseUrl}/auth/v1/token`, () =>
      HttpResponse.json({ access_token: proofToken, user: { id: other } })
    ),
    http.post(`${supabaseUrl}/auth/v1/logout`, ({ request }) => {
      temporarySessions.delete(request.headers.get('authorization')?.replace('Bearer ', '') ?? '')
      return new HttpResponse(null, { status: 204 })
    }),
  )

  const response = await createAccountDeletionEndpoint(settings)(request({
    action: 'verify', intent: crypto.randomUUID(), code: crypto.randomUUID(),
  }))

  expect(response.status).toBe(409)
  expect(temporarySessions.size).toBe(0)
})

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
