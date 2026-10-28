import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('Hello API demo', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the successful response after the user calls the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Hello from Supabase!', ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Call the API' }))

    expect(await screen.findByText('API request succeeded.')).toBeInTheDocument()
    expect(screen.getByLabelText('API response')).toHaveTextContent('"Hello from Supabase!"')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/functions\/v1\/hello$/),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('announces a request failure and lets the user retry', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('Network unavailable'))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    const button = screen.getByRole('button', { name: 'Call the API' })
    await userEvent.click(button)

    expect(await screen.findByText('API request failed: Network unavailable')).toBeInTheDocument()
    expect(button).toBeEnabled()
  })
})
