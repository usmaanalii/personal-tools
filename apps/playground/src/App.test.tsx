import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import App from './App'
import { helloEndpoint, server } from './test-server'

describe('Hello API demo', () => {
  it('shows the successful response after the user calls the API', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Call the API' }))

    expect(await screen.findByText('API request succeeded.')).toBeInTheDocument()
    expect(screen.getByLabelText('API response')).toHaveTextContent('"Hello from Supabase!"')
  })

  it('announces a request failure and lets the user retry', async () => {
    server.use(
      http.get(helloEndpoint, () =>
        HttpResponse.json({ error: 'Network unavailable' }, { status: 503 }),
      ),
    )

    render(<App />)
    const button = screen.getByRole('button', { name: 'Call the API' })
    await userEvent.click(button)

    expect(await screen.findByText('API request failed: Network unavailable')).toBeInTheDocument()
    expect(button).toBeEnabled()
  })
})
