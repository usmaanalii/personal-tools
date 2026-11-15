import { AuthClient } from '@supabase/auth-js'
import type { Session } from '@scratch-pages/auth'
import { z } from 'zod'
import { takeAuthCallback, type CallbackResult } from './auth-callback'

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
}: {
  readonly supabaseUrl: string
  readonly supabasePublishableKey: string
  readonly redirectTo: string
  readonly navigate?: (url: string) => void
  readonly incoming?: ReturnType<typeof takeAuthCallback>
}) {
  const endpoint = new URL('/auth/v1/', supabaseUrl)
  const client = new AuthClient({
    url: endpoint.href.slice(0, -1),
    headers: { apikey: supabasePublishableKey },
    storageKey: `playground-auth:${endpoint.origin}`,
    flowType: 'pkce',
    detectSessionInUrl: false,
  })

  const callback: Promise<CallbackResult> | undefined = typeof incoming === 'object'
    ? client.exchangeCodeForSession(incoming.code).then(
      ({ error }) => error ? 'failed' : 'complete',
      () => 'failed',
    )
    : incoming && Promise.resolve(incoming)

  return {
    callback,
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
    async signOut() {
      const { error } = await client.signOut({ scope: 'local' })
      if (error) throw new Error('Could not sign out.')
    },
  }
}
