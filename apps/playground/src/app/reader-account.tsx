import { useEffect, useRef, useState } from 'react'
import type { Auth, EmailLinkAuth, Session } from '@scratch-pages/auth'
import { Button, EmailLinkForm } from '@scratch-pages/ui'
import type { CallbackResult } from './auth-callback'
import googleSignInArtwork from './google-sign-in.png'
import { ReaderAccountDeletion, type AccountDeletion, type DeletionCallbackResult } from './reader-account-deletion'

type Operation = 'sign-in' | 'sign-out'
type AccountAction = { readonly operation: Operation; readonly status: 'pending' | 'failed' }

export type ReaderAuth = Auth & {
  readonly callback?: Promise<CallbackResult>
  readonly requestEmailLink?: EmailLinkAuth['requestEmailLink'] | undefined
  readonly deletion?: AccountDeletion | undefined
  readonly deletionCallback?: Promise<DeletionCallbackResult> | undefined
}

export function ReaderAccount({ auth }: { readonly auth: ReaderAuth }) {
  const { callback, deletionCallback } = auth
  const [deletionReturn, setDeletionReturn] = useState<DeletionCallbackResult | 'pending' | undefined>(
    deletionCallback ? 'pending' : undefined,
  )
  const [deleted, setDeleted] = useState(false)
  const deletedMessage = useRef<HTMLParagraphElement>(null)
  const [session, setSession] = useState<Session>()
  const [action, setAction] = useState<AccountAction>()
  const [callbackState, setCallbackState] = useState<CallbackResult | 'pending' | undefined>(
    callback ? 'pending' : undefined,
  )
  useEffect(() => auth.observeSession(setSession), [auth])
  useEffect(() => {
    let active = true
    void deletionCallback?.then(result => { if (active) setDeletionReturn(result) })
    return () => { active = false }
  }, [deletionCallback])
  useEffect(() => {
    if (deleted) deletedMessage.current?.focus()
  }, [deleted])
  useEffect(() => {
    let active = true
    void callback?.then(result => { if (active) setCallbackState(result) })
    return () => { active = false }
  }, [callback])
  useEffect(() => {
    function resetRedirect(event: PageTransitionEvent) {
      if (event.persisted) {
        setAction(current => current?.operation === 'sign-in' ? undefined : current)
      }
    }
    window.addEventListener('pageshow', resetRedirect)
    return () => window.removeEventListener('pageshow', resetRedirect)
  }, [])

  async function run(operation: Operation) {
    setCallbackState(undefined)
    setAction({ operation, status: 'pending' })
    try {
      if (operation === 'sign-in') {
        await auth.signIn()
        return
      }
      await auth.signOut()
      setAction(undefined)
    } catch {
      setAction({ operation, status: 'failed' })
    }
  }

  const signInState = action?.operation === 'sign-in' ? action.status : undefined
  const signOutState = action?.operation === 'sign-out' ? action.status : undefined

  return <section aria-label="Reader account" className="bg-ui-surface text-ui-foreground">
    <div className="mx-auto max-w-3xl px-3 py-3 sm:px-8">
      {session?.status === 'authenticated' && callbackState !== 'pending' && <>
        <p className="m-0 wrap-anywhere">{session.identity.label}</p>
        <Button variant="outline" disabled={signOutState === 'pending'} onClick={() => void run('sign-out')}>Sign out</Button>
        {auth.deletion && deletionReturn !== 'pending' && <ReaderAccountDeletion
          key={session.identity.id}
          identity={session.identity}
          deletion={auth.deletion}
          verifiedIntent={deletionReturn?.status === 'verified' && deletionReturn.accountId === session.identity.id
            ? deletionReturn.intent
            : undefined}
          onDismiss={() => setDeletionReturn(undefined)}
          onDeleted={() => {
            setDeletionReturn(undefined)
            setDeleted(true)
          }}
          disabled={signOutState === 'pending'}
        />}
        {signOutState === 'pending' && <p role="status">Signing out…</p>}
        {signOutState === 'failed' && <p role="alert">Could not sign out. Try again.</p>}
      </>}
      {deletionReturn === 'pending' && <p role="status">Verifying account deletion link…</p>}
      {deletionReturn !== 'pending' && deletionReturn?.status === 'invalid' && <p role="alert">
        This deletion link is invalid or expired. Request a new link from your account.
      </p>}
      {deleted && <p role="status" tabIndex={-1} ref={deletedMessage}>Account deleted.</p>}
      {callbackState === 'pending' && <p role="status">Finishing sign-in…</p>}
      {callbackState === 'cancelled' && <p role="status">Sign-in was cancelled.</p>}
      {callbackState === 'failed' && <p role="alert">Could not finish sign-in. Try again.</p>}
      {callbackState === 'link-expired' && <p role="alert">This sign-in link is invalid or expired. Request a new link.</p>}
      {session?.status === 'guest' && callbackState !== 'pending' && <>
        <Button variant="ghost" size="compact" className="max-w-full" disabled={signInState === 'pending'} onClick={() => void run('sign-in')}>
          <img className="h-auto min-w-0" src={googleSignInArtwork} width={180} height={40} alt="Sign in with Google" />
        </Button>
        {signInState === 'pending' && <p role="status">Opening Google sign-in…</p>}
        {signInState === 'failed' && <p role="alert">Could not start sign-in. Try again.</p>}
        {auth.requestEmailLink && <EmailLinkForm requestLink={auth.requestEmailLink} disabled={signInState === 'pending'} />}
      </>}
    </div>
  </section>
}
