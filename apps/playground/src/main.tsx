import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App, { getPlaygroundRoute } from './app/app'
import { takeAuthCallback } from './app/auth-callback'
import { getSupabaseConfig } from './prototypes/supabase/config'
import './app/styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('The app root element was not found.')

const root = createRoot(rootElement)

if (getPlaygroundRoute() === 'quran') {
  const incoming = takeAuthCallback()
  void import('./app/supabase-auth').then(({ createSupabaseAuth }) => {
    const auth = createSupabaseAuth({ ...getSupabaseConfig(), incoming })
    root.render(<StrictMode><App auth={auth} /></StrictMode>)
  }).catch(() => {
    // The reader is public and can still render when the auth module cannot start.
  })
}

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
