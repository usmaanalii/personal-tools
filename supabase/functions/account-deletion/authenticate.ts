import { z } from 'zod'
import type { AccountDeletionSession } from './handler.ts'

type Options = {
  readonly supabaseUrl: string
  readonly apiKey: string
  readonly sessionIsActive: (session: AccountDeletionSession) => Promise<boolean>
}

const claimsSchema = z.object({ sub: z.uuid(), session_id: z.uuid() })
const userSchema = z.object({ id: z.uuid(), is_anonymous: z.literal(false).optional() })

export function readAccountDeletionClaims(token: string) {
  const [, payload] = token.split('.')
  if (!payload) return undefined

  try {
    const json: unknown = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')))
    return claimsSchema.safeParse(json).data
  } catch {
    return undefined
  }
}

export function authenticateAccountDeletion({ supabaseUrl, apiKey, sessionIsActive }: Options) {
  return async (token: string): Promise<AccountDeletionSession | undefined> => {
    const claims = readAccountDeletionClaims(token)
    if (!claims) return undefined

    const response = await fetch(new URL('/auth/v1/user', supabaseUrl), {
      headers: { apikey: apiKey, authorization: `Bearer ${token}` },
    })
    if (response.status >= 500) throw new Error('Account verification is unavailable')
    if (!response.ok) return undefined

    const body: unknown = await response.json()
    const user = userSchema.safeParse(body).data
    if (user?.id !== claims.sub) return undefined

    const session = { accountId: user.id, sessionId: claims.session_id }
    return await sessionIsActive(session) ? session : undefined
  }
}
