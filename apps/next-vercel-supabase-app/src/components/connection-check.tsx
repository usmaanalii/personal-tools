'use client'

import { useState } from 'react'
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
    <section className="connection-card" aria-labelledby="connection-heading">
      <p className="eyebrow">LIVE CONNECTION</p>
      <h2 id="connection-heading">Say hello to Supabase.</h2>
      <p>
        The request travels through this app’s Next.js server to a public
        Supabase function.
      </p>
      <button
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
      </button>
      {state.status === 'error' && (
        <p className="error" role="alert">
          The connection check failed. Please try again.
        </p>
      )}
      <p className="connection-result" role="status">
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
