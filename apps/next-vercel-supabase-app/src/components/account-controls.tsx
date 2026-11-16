'use client'

import type { Auth, Session } from '@scratch-pages/auth'
import { Button } from '@scratch-pages/ui'
import { useState } from 'react'
import { z } from 'zod'

type AccountActions = Pick<Auth, 'signIn' | 'signOut'>

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
}

export function AccountControls({
  session,
  actions = browserActions,
  callback,
}: {
  readonly session: Session
  readonly actions?: AccountActions
  readonly callback?: 'denied' | 'failed' | undefined
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
          {callback === 'denied'
            ? 'Google sign-in was cancelled or denied.'
            : 'Could not finish Google sign-in. Try again.'}
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
