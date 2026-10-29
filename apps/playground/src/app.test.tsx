import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import App from './app/app'
import { helloEndpoint, server } from './test-server'

function renderAtPath(path: string) {
  window.history.pushState({}, '', path)
  render(<App />)
}

afterEach(() => window.history.pushState({}, '', '/'))

describe('Playground navigation', () => {
  it('offers separate destinations for the Quran reader and Supabase demo', () => {
    renderAtPath('/')

    expect(screen.getByRole('heading', { name: 'Playground' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Quran reader/i }).getAttribute('href')).toMatch(/quran\/$/)
    expect(screen.getByRole('link', { name: /Supabase API demo/i }).getAttribute('href')).toMatch(/supabase\/$/)
  })

  it('keeps the Supabase request demo available at its own route', async () => {
    renderAtPath('/supabase/')
    await userEvent.click(await screen.findByRole('button', { name: 'Call the API' }))

    expect(await screen.findByText('API request succeeded.')).toBeInTheDocument()
    expect(screen.getByLabelText('API response')).toHaveTextContent('"Hello from Supabase!"')
  })

  it('opens the Quran reader directly at its own route', async () => {
    renderAtPath('/quran/')

    expect(await screen.findByRole('heading', { name: 'Al-Fātiḥah' })).toBeInTheDocument()
  })

  it('announces a Supabase request failure and lets the user retry', async () => {
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
