import { z } from 'zod'
import { authenticateAccountDeletion } from './authenticate.ts'
import { confirmAccountDeletion } from './confirm.ts'
import { accountDeletionHandler } from './handler.ts'

type Configuration = {
  readonly supabaseUrl: string
  readonly publicKey: string
  readonly serviceRoleKey: string
}

const claimResult = z.enum(['claimed', 'pending', 'invalid_intent'])

export function createAccountDeletionEndpoint({ supabaseUrl, publicKey, serviceRoleKey }: Configuration) {
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

  return (request: Request) => accountDeletionHandler(request, { authenticate, confirm })
}
