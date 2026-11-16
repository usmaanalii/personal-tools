import type { AccountDeletionSession } from './handler.ts'

type Options = {
  readonly supabaseUrl: string
  readonly serviceRoleKey: string
  readonly claim: (session: AccountDeletionSession, intent: string) => Promise<'claimed' | 'invalid_intent' | 'pending'>
}

export function confirmAccountDeletion({ supabaseUrl, serviceRoleKey, claim }: Options) {
  return async (session: AccountDeletionSession, intent: string) => {
    const result = await claim(session, intent)
    if (result !== 'claimed') return result

    const response = await fetch(new URL(`/auth/v1/admin/users/${session.accountId}`, supabaseUrl), {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ should_soft_delete: false }),
      redirect: 'error',
    }).catch(() => undefined)
    return response?.ok ? 'deleted' : 'pending'
  }
}
