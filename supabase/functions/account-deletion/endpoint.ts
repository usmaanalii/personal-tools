import { z } from 'zod'
import { authenticateAccountDeletion, readAccountDeletionClaims } from './authenticate.ts'
import { confirmAccountDeletion } from './confirm.ts'
import { accountDeletionHandler } from './handler.ts'

type Configuration = {
  readonly supabaseUrl: string
  readonly publicKey: string
  readonly serviceRoleKey: string
  readonly callbacks?: Readonly<Partial<Record<'playground' | 'next', string>>>
}

const claimResult = z.enum(['claimed', 'pending', 'invalid_intent'])
const beginResult = z.discriminatedUnion('status', [
  z.object({ status: z.literal('started'), email: z.email() }),
  z.object({ status: z.literal('invalid_intent') }),
  z.object({ status: z.literal('rate_limited') }),
])
const exchangeResult = z.discriminatedUnion('status', [
  z.object({ status: z.literal('exchange'), verifier: z.string() }),
  z.object({ status: z.literal('invalid_intent') }),
])
const proofSession = z.object({ access_token: z.string(), user: z.object({ id: z.uuid() }) })
const verifyResult = z.object({ status: z.enum(['verified', 'invalid_intent']) })
const cancelResult = z.object({ status: z.enum(['cancelled', 'invalid_intent', 'pending']) })

export function createAccountDeletionEndpoint({ supabaseUrl, publicKey, serviceRoleKey, callbacks }: Configuration) {
  async function rpc(operation: string, body: Record<string, string>): Promise<unknown> {
    const response = await fetch(new URL(`/rest/v1/rpc/${operation}`, supabaseUrl), {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      redirect: 'error',
    })
    if (!response.ok) throw new Error('Account deletion storage is unavailable')
    return await response.json()
  }

  const authenticate = authenticateAccountDeletion({
    supabaseUrl,
    apiKey: publicKey,
    sessionIsActive: async ({ accountId, sessionId }) =>
      z.boolean().parse(await rpc('account_deletion_session_active', { account: accountId, session: sessionId })),
  })

  const confirm = confirmAccountDeletion({
    supabaseUrl,
    serviceRoleKey,
    claim: async ({ accountId, sessionId }, intent) =>
      claimResult.parse(await rpc('claim_account_deletion', { account: accountId, session: sessionId, intent })),
  })

  const handle = (request: Request) => accountDeletionHandler(request, {
    authenticate,
    confirm,
    begin: async ({ accountId, sessionId }, app) => {
      const configuredCallback = callbacks?.[app]
      if (!configuredCallback) return { status: 'invalid_intent' }

      const callback = new URL(configuredCallback)
      const intent = crypto.randomUUID()
      callback.searchParams.set('deletion_intent', intent)
      const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte =>
        byte.toString(16).padStart(2, '0')).join('')
      const stored = beginResult.parse(await rpc('account_deletion_proof', {
        operation: 'begin', account: accountId, session: sessionId, intent, verifier,
      }))
      if (stored.status !== 'started') return stored

      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
      const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
      const otp = new URL('/auth/v1/otp', supabaseUrl)
      otp.searchParams.set('redirect_to', callback.href)
      const response = await fetch(otp, {
        method: 'POST',
        headers: { apikey: publicKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          email: stored.email, create_user: false, code_challenge: challenge, code_challenge_method: 's256',
        }),
        redirect: 'error',
      })
      if (!response.ok) throw new Error('Deletion verification email is unavailable')
      return { status: 'sent', intent }
    },
    verify: async ({ accountId, sessionId }, intent, code) => {
      const identity = { account: accountId, session: sessionId, intent }
      const result = exchangeResult.parse(await rpc('account_deletion_proof', { operation: 'exchange', ...identity }))
      if (result.status !== 'exchange') return result.status

      const exchange = await fetch(new URL('/auth/v1/token?grant_type=pkce', supabaseUrl), {
        method: 'POST',
        headers: { apikey: publicKey, 'content-type': 'application/json' },
        body: JSON.stringify({ auth_code: code, code_verifier: result.verifier }),
        redirect: 'error',
      })
      if (exchange.status >= 500) throw new Error('Deletion proof exchange is unavailable')
      if (!exchange.ok) return 'invalid_intent'

      const proof = proofSession.parse(await exchange.json())
      const claims = readAccountDeletionClaims(proof.access_token)
      if (!claims || claims.session_id === sessionId) return 'invalid_intent'

      const revoked = await fetch(new URL('/auth/v1/logout?scope=local', supabaseUrl), {
        method: 'POST',
        headers: { apikey: publicKey, authorization: `Bearer ${proof.access_token}` },
        redirect: 'error',
      })
      if (!revoked.ok) throw new Error('Deletion proof session could not be revoked')
      if (proof.user.id !== accountId || claims.sub !== accountId) return 'invalid_intent'

      const { status } = verifyResult.parse(await rpc('account_deletion_proof', { operation: 'verified', ...identity }))
      return status
    },
    cancel: async ({ accountId, sessionId }, intent) => {
      const { status } = cancelResult.parse(await rpc('account_deletion_proof', {
        operation: 'cancel', account: accountId, session: sessionId, intent,
      }))
      return status
    },
  })

  const readerOrigin = callbacks?.playground && new URL(callbacks.playground).origin
  return async (request: Request) => {
    const origin = request.headers.get('origin')
    const headers = new Headers({ 'cache-control': 'no-store', vary: 'Origin' })
    if (origin && origin !== readerOrigin) {
      return new Response(null, { status: 403, headers })
    }
    if (origin) headers.set('access-control-allow-origin', origin)
    if (request.method === 'OPTIONS') {
      headers.set('access-control-allow-methods', 'POST')
      headers.set('access-control-allow-headers', 'authorization, content-type, apikey, x-client-info')
      return new Response(null, { status: 204, headers })
    }
    const response = await handle(request)
    headers.forEach((value, key) => {
      response.headers.set(key, value)
    })
    return response
  }
}
