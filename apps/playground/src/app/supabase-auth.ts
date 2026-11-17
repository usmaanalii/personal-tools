import { AuthClient } from '@supabase/auth-js'
import type { Auth, EmailLinkAuth, Session } from '@scratch-pages/auth'
import { z } from 'zod'
import { takeAuthCallback, type CallbackResult } from './auth-callback'
import type { AccountDeletion, DeletionCallbackResult } from './reader-account-deletion'

const sessionSchema = z.object({
  expires_at: z.number().int().positive(),
  user: z.object({
    id: z.uuid(),
    email: z.email().optional(),
  }),
})

export function createSupabaseAuth({
  supabaseUrl,
  supabasePublishableKey,
  redirectTo,
  navigate = url => window.location.assign(url),
  incoming = takeAuthCallback(),
  accountDeletionEnabled = false,
}: {
  readonly supabaseUrl: string
  readonly supabasePublishableKey: string
  readonly redirectTo: string
  readonly navigate?: (url: string) => void
  readonly incoming?: ReturnType<typeof takeAuthCallback>
  readonly accountDeletionEnabled?: boolean
}) {
  const endpoint = new URL('/auth/v1/', supabaseUrl)
  const client = new AuthClient({
    url: endpoint.href.slice(0, -1),
    headers: { apikey: supabasePublishableKey },
    storageKey: `playground-auth:${endpoint.origin}`,
    flowType: 'pkce',
    detectSessionInUrl: false,
  })

  async function requestDeletion(command:
    | { readonly action: 'begin'; readonly app: 'playground' }
    | { readonly action: 'verify'; readonly intent: string; readonly code: string }
    | { readonly action: 'confirm' | 'cancel'; readonly intent: string },
    expectedAccount?: string,
  ) {
    const { data, error } = await client.getSession()
    if (error || !data.session) throw new Error('Account session unavailable.')
    const accountId = data.session.user.id
    if (expectedAccount && accountId !== expectedAccount) throw new Error('Account session changed.')
    const response = await fetch(new URL('/functions/v1/account-deletion', endpoint), {
      method: 'POST',
      headers: {
        apikey: supabasePublishableKey,
        authorization: `Bearer ${data.session.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(command),
    })
    return { response, accountId }
  }

  async function verifyDeletion(intent: string, code: string): Promise<DeletionCallbackResult> {
    const { response, accountId } = await requestDeletion({ action: 'verify', intent, code })
    if (response.status === 200) return { status: 'verified', intent, accountId }
    return { status: 'invalid' }
  }

  async function beginDeletion() {
    const { response } = await requestDeletion({ action: 'begin', app: 'playground' })
    if (response.status === 429) return { status: 'rate-limited' } as const
    if (response.status !== 201) throw new Error('Could not send a verification link.')
    return z.object({ status: z.literal('sent'), intent: z.uuid() }).parse(await response.json())
  }

  async function confirmDeletion(intent: string, accountId: string) {
    const { response } = await requestDeletion({ action: 'confirm', intent }, accountId)
    if (response.status === 202) return 'pending' as const
    if (response.status === 409) return 'invalid' as const
    if (response.status !== 204) throw new Error('Could not confirm account deletion.')
    const { data } = await client.getSession()
    if (data.session?.user.id === accountId) await client.signOut({ scope: 'local' })
    return 'deleted' as const
  }

  async function cancelDeletion(intent: string, accountId: string) {
    const { response } = await requestDeletion({ action: 'cancel', intent }, accountId)
    if (response.status === 202) return 'pending' as const
    if (response.status === 409) return 'invalid' as const
    if (response.status !== 200) throw new Error('Could not cancel account deletion.')
    return 'cancelled' as const
  }

  const signInReturn = typeof incoming === 'object' && 'deletion' in incoming ? undefined : incoming
  const callback: Promise<CallbackResult> | undefined = typeof signInReturn === 'object'
    ? client.exchangeCodeForSession(signInReturn.code).then(
        ({ error }) => error ? 'failed' : 'complete',
        () => 'failed',
      )
    : signInReturn && Promise.resolve(signInReturn)
  const deletionReturn = typeof incoming === 'object' && 'deletion' in incoming ? incoming : undefined
  const deletionCallback = deletionReturn && (
    accountDeletionEnabled && deletionReturn.deletion
      ? verifyDeletion(deletionReturn.deletion.intent, deletionReturn.deletion.code).catch(() => ({ status: 'invalid' } as const))
      : Promise.resolve({ status: 'invalid' } as const)
  )

  return {
    callback,
    deletionCallback,
    deletion: accountDeletionEnabled ? { begin: beginDeletion, confirm: confirmDeletion, cancel: cancelDeletion } : undefined,
    observeSession(listener: (session: Session) => void) {
      let expiryTimer: number | undefined
      const { data: { subscription } } = client.onAuthStateChange((_event, session) => {
        window.clearTimeout(expiryTimer)
        const current = sessionSchema.safeParse(session)
        const remaining = current.success ? current.data.expires_at * 1000 - Date.now() : 0
        if (!current.success || remaining <= 0) {
          listener({ status: 'guest' })
          return
        }
        expiryTimer = window.setTimeout(() => listener({ status: 'guest' }), remaining)
        const { id, email } = current.data.user
        listener({ status: 'authenticated', identity: { id, label: email ?? 'Signed in' } })
      })
      return () => {
        subscription.unsubscribe()
        window.clearTimeout(expiryTimer)
      }
    },
    async signIn() {
      if (!window.navigator.onLine || !window.crypto?.subtle) throw new Error('Could not start sign-in.')
      const { data, error } = await client.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error || !data.url) throw new Error('Could not start sign-in.')
      navigate(data.url)
    },
    async requestEmailLink(email) {
      if (!window.crypto?.subtle) throw new Error('Could not request an email sign-in link.')
      const { error } = await client.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
      if (error?.status === 429) return 'rate-limited'
      if (error) throw new Error('Could not request an email sign-in link.')
      return 'accepted'
    },
    async signOut() {
      const { error } = await client.signOut({ scope: 'local' })
      if (error) throw new Error('Could not sign out.')
    },
  } satisfies Auth & EmailLinkAuth & {
    readonly callback: Promise<CallbackResult> | undefined
    readonly deletionCallback: Promise<DeletionCallbackResult> | undefined
    readonly deletion: AccountDeletion | undefined
  }
}
