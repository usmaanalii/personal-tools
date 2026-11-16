'use client'

import type { Auth, EmailLinkAuth, Session } from '@scratch-pages/auth'
import { Button, EmailLinkForm } from '@scratch-pages/ui'
import { useState } from 'react'
import { z } from 'zod'

type AccountActions = Pick<Auth, 'signIn' | 'signOut'> & Partial<EmailLinkAuth>

const callbackMessages = {
  denied: 'Google sign-in was cancelled or denied.',
  failed:
    'Could not finish sign-in. For email sign-in, request a new link and open it in this browser.',
  'link-expired':
    'This sign-in link is invalid or expired. Request a new link.',
}

const signInResponse = z.object({ url: z.url() })

const browserActions: AccountActions = {
  async signIn() {
    const response = await fetch('/auth/sign-in', { method: 'POST' })
    if (!response.ok) throw new Error('Could not open Google')
    const { url } = signInResponse.parse(await response.json())
    window.location.assign(url)
  },
  async signOut() {
    const response = await fetch('/auth/sign-out', { method: 'POST' })
    if (!response.ok) throw new Error('Could not sign out')
    window.location.reload()
  },
  async requestEmailLink(email) {
    const response = await fetch('/auth/email-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (response.status === 429) return 'rate-limited'
    if (!response.ok)
      throw new Error('Could not request an email sign-in link.')
    return 'accepted'
  },
}

export function AccountControls({
  session,
  actions = browserActions,
  callback,
}: {
  readonly session: Session
  readonly actions?: AccountActions
  readonly callback?: keyof typeof callbackMessages | undefined
}) {
  const [phase, setPhase] = useState<'initial' | 'idle' | 'pending' | 'failed'>(
    'initial',
  )
  const pending = phase === 'pending'
  const signedIn = session.status === 'authenticated'
  const label = signedIn ? 'Sign out' : 'Sign in with Google'
  const progress = signedIn ? 'Signing out…' : 'Opening Google…'

  async function activate() {
    setPhase('pending')
    try {
      await (signedIn ? actions.signOut() : actions.signIn())
      setPhase('idle')
    } catch {
      setPhase('failed')
    }
  }

  return (
    <section
      id="account"
      aria-labelledby="account-heading"
      className="mt-8"
      tabIndex={-1}
    >
      <h2 id="account-heading" className="mb-3 text-2xl">
        Account
      </h2>
      {phase === 'initial' && callback && (
        <p role="alert" className="mb-4 text-ui-error">
          {callbackMessages[callback]}
        </p>
      )}
      {signedIn && (
        <p className="mb-4 wrap-anywhere">
          Signed in as {session.identity.label}
        </p>
      )}
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          void activate()
        }}
      >
        {pending ? progress : label}
      </Button>
      {!signedIn && actions.requestEmailLink && (
        <EmailLinkForm
          requestLink={actions.requestEmailLink}
          disabled={pending}
        />
      )}
      <p role="status" className="sr-only">
        {pending ? progress : ''}
      </p>
      {phase === 'failed' && (
        <p role="alert" className="mt-3 text-ui-error">
          {signedIn
            ? 'Could not sign out. Try again.'
            : 'Could not open Google. Try again.'}
        </p>
      )}
    </section>
  )
}
