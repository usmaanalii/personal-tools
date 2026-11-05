import { useState } from 'react'
import { Button } from '@scratch-pages/ui'
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
    <main className="supabase-demo mx-auto my-[12vh] max-w-[46rem] px-6 font-ui-body leading-[1.6] text-ui-foreground">
      <a className="mb-[18px] inline-block text-[.9rem] text-ui-primary" href={import.meta.env.BASE_URL}>← All playground pages</a>
      <h1 className="leading-[1.15]">Hello from GitHub Pages</h1>
      <p>This page calls a Supabase Edge Function with a GET request.</p>
      <Button className="mt-4" onClick={handleCallApi} disabled={apiState.status === 'loading'}>
        Call the API
      </Button>
      <section aria-label="API response" aria-live="polite"><pre className="min-h-12 overflow-x-auto rounded-ui-control border border-solid border-ui-border bg-ui-surface p-4 whitespace-pre-wrap wrap-anywhere">{messageForState(apiState)}</pre></section>
      <p className="text-ui-muted" role="status" aria-live="polite">{statusForState(apiState)}</p>
    </main>
  )
}
