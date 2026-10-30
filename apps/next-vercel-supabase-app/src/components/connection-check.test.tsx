import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'
import Home from '../app/page'
import { server } from '../test/server'

function renderPage() {
  const user = userEvent.setup()
  render(<Home />)
  return user
}

it('shows the greeting after checking the connection', async () => {
  server.use(
    http.get('/api/supabase', () =>
      HttpResponse.json({ ok: true, message: 'Hello from Supabase!' }),
    ),
  )
  const user = renderPage()
  await user.click(screen.getByRole('button', { name: 'Check connection' }))
  expect(
    await screen.findByRole('button', { name: 'Check again' }),
  ).toBeEnabled()
  expect(screen.getByRole('status')).toHaveTextContent('Hello from Supabase!')
})

it('recovers when Try again is selected after a failed connection check', async () => {
  server.use(
    http.get('/api/supabase', () =>
      HttpResponse.json({ error: 'Backend unavailable' }, { status: 502 }),
    ),
  )
  const user = renderPage()
  await user.click(screen.getByRole('button', { name: 'Check connection' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The connection check failed. Please try again.',
  )
  server.use(
    http.get('/api/supabase', () =>
      HttpResponse.json({ ok: true, message: 'Hello from Supabase!' }),
    ),
  )
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByRole('button', { name: 'Check again' })
  expect(screen.getByRole('status')).toHaveTextContent('Hello from Supabase!')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('shows progress and disables repeated submission when Enter activates Check connection', async () => {
  const pending = Promise.withResolvers<void>()
  server.use(
    http.get('/api/supabase', async () => {
      await pending.promise
      return HttpResponse.json({ ok: true, message: 'Hello from Supabase!' })
    }),
  )
  const user = renderPage()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Check connection' })).toHaveFocus()
  try {
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('button', { name: 'Checking connection…' }),
    ).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Waiting for Supabase…',
    )
  } finally {
    pending.resolve()
  }
  expect(
    await screen.findByRole('button', { name: 'Check again' }),
  ).toBeEnabled()
  expect(screen.getByRole('status')).toHaveTextContent('Hello from Supabase!')
})

it('offers a retry when the connection response has an invalid greeting', async () => {
  server.use(
    http.get('/api/supabase', () =>
      HttpResponse.json({ ok: true, message: 42 }),
    ),
  )
  const user = renderPage()
  await user.click(screen.getByRole('button', { name: 'Check connection' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The connection check failed. Please try again.',
  )
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
})
