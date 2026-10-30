import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../../app/app'
import { helloEndpoint, server } from '../../test-server'

function renderAtPath(path: string) {
  window.history.pushState({}, '', path)
  render(<App />)
}

afterEach(() => window.history.pushState({}, '', '/'))

describe('Supabase demo', () => {
  it('shows the greeting when Call the API is selected', async () => {
    renderAtPath('/supabase/')
    await userEvent.click(await screen.findByRole('button', { name: 'Call the API' }))

    expect(await screen.findByText('API request succeeded.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'API response' })).toHaveTextContent('"Hello from Supabase!"')
  })

  it('shows an error and re-enables Call the API when the greeting cannot be loaded', async () => {
    server.use(
      http.get(helloEndpoint, () =>
        HttpResponse.json({ error: 'Network unavailable' }, { status: 503 }),
      ),
    )
    renderAtPath('/supabase/')
    const button = await screen.findByRole('button', { name: 'Call the API' })
    await userEvent.click(button)

    expect(await screen.findByText('API request failed: Network unavailable')).toBeInTheDocument()
    expect(button).toBeEnabled()
  })
})


it('rejects a greeting that contradicts the success contract', async () => {
  server.use(http.get(helloEndpoint, () => HttpResponse.json({ ok: false, message: 'Not a success' })))
  renderAtPath('/supabase/')
  await userEvent.click(await screen.findByRole('button', { name: 'Call the API' }))
  expect(await screen.findByText('API request failed: The API returned an unexpected response.')).toBeInTheDocument()
  expect(screen.queryByText('API request succeeded.')).not.toBeInTheDocument()
})
