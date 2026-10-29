import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/app'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('The app root element was not found.')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
