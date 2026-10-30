import { useState } from 'react'
import { getHello, type HelloResponse } from './hello-api'
import './supabase-demo.css'

type ApiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: HelloResponse }
  | { status: 'error'; message: string }

const initialState: ApiState = { status: 'idle' }

function messageForState(state: ApiState): string {
  switch (state.status) {
    case 'idle': return 'API response will appear here.'
    case 'loading': return 'Waiting for the API response…'
    case 'success': return JSON.stringify(state.data, null, 2)
    case 'error': return 'No API response is available.'
  }
}

function statusForState(state: ApiState): string {
  switch (state.status) {
    case 'idle': return 'The API project is connected. Click the button to test it.'
    case 'loading': return 'Calling Supabase…'
    case 'success': return 'API request succeeded.'
    case 'error': return `API request failed: ${state.message}`
  }
}

export default function SupabaseDemo() {
  const [apiState, setApiState] = useState<ApiState>(initialState)

  async function handleCallApi() {
    setApiState({ status: 'loading' })
    try {
      const data = await getHello()
      setApiState({ status: 'success', data })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
      setApiState({ status: 'error', message })
    }
  }

  return (
    <main className="page supabase-demo">
      <a className="back-home" href={import.meta.env.BASE_URL}>← All playground pages</a>
      <h1>Hello from GitHub Pages</h1>
      <p>This page calls a Supabase Edge Function with a GET request.</p>
      <button type="button" onClick={handleCallApi} disabled={apiState.status === 'loading'}>
        Call the API
      </button>
      <section aria-label="API response" aria-live="polite"><pre>{messageForState(apiState)}</pre></section>
      <p className="hint" role="status" aria-live="polite">{statusForState(apiState)}</p>
    </main>
  )
}
