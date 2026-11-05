'use client'

import { useState } from 'react'
import { Button } from '@scratch-pages/ui'
import { greetingSchema } from '../lib/greeting'

type ConnectionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error' }

export function ConnectionCheck() {
  const [state, setState] = useState<ConnectionState>({ status: 'idle' })

  async function checkConnection() {
    setState({ status: 'loading' })
    try {
      const response = await fetch('/api/supabase', { cache: 'no-store' })
      if (!response.ok) throw new Error('Connection check failed')
      const payload: unknown = await response.json()
      const greeting = greetingSchema.parse(payload)
      setState({ status: 'success', message: greeting.message })
    } catch {
      setState({ status: 'error' })
    }
  }

  return (
    <section
      className="rounded-ui-card border border-solid border-ui-border bg-ui-surface p-[clamp(1.5rem,5vw,3rem)] shadow-ui-card"
      aria-labelledby="connection-heading"
    >
      <p className="m-0 max-w-[40rem] font-mono text-[.8rem] tracking-[.07em] text-ui-primary">
        LIVE CONNECTION
      </p>
      <h2
        id="connection-heading"
        className="mt-3 mb-4 text-[clamp(1.5rem,4vw,2rem)] leading-[1.25]"
      >
        Say hello to Supabase.
      </h2>
      <p className="max-w-[40rem] text-ui-muted">
        The request travels through this app’s Next.js server to a public
        Supabase function.
      </p>
      <Button
        className="mt-4"
        type="button"
        disabled={state.status === 'loading'}
        onClick={() => {
          void checkConnection()
        }}
      >
        {state.status === 'loading'
          ? 'Checking connection…'
          : state.status === 'idle'
            ? 'Check connection'
            : state.status === 'error'
              ? 'Try again'
              : 'Check again'}
      </Button>
      {state.status === 'error' && (
        <p className="max-w-[40rem] text-ui-error" role="alert">
          The connection check failed. Please try again.
        </p>
      )}
      <p
        className="mb-0 min-h-[1.6em] max-w-[40rem] text-ui-foreground wrap-anywhere"
        role="status"
      >
        {state.status === 'success'
          ? state.message
          : state.status === 'loading'
            ? 'Waiting for Supabase…'
            : state.status === 'error'
              ? ''
              : 'Ready when you are.'}
      </p>
    </section>
  )
}
