import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { AccountControls } from './account-controls'

it('starts Google sign-in once and announces progress while it waits', async () => {
  const pending = Promise.withResolvers<void>()
  const actions = {
    signIn: vi.fn(() => pending.promise),
    signOut: vi.fn(async () => {}),
  }
  const user = userEvent.setup()
  render(<AccountControls session={{ status: 'guest' }} actions={actions} />)
  await user.tab()
  expect(
    screen.getByRole('button', { name: 'Sign in with Google' }),
  ).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('button', { name: 'Opening Google…' })).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Opening Google…')
  expect(actions.signIn).toHaveBeenCalledTimes(1)
  pending.resolve()
})

it('offers a retry when starting Google sign-in fails', async () => {
  const actions = {
    signIn: vi.fn(async () => {}).mockRejectedValueOnce(new Error('offline')),
    signOut: vi.fn(async () => {}),
  }
  const user = userEvent.setup()
  render(<AccountControls session={{ status: 'guest' }} actions={actions} />)
  await user.click(screen.getByRole('button', { name: 'Sign in with Google' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not open Google. Try again.',
  )
  await user.click(screen.getByRole('button', { name: 'Sign in with Google' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(actions.signIn).toHaveBeenCalledTimes(2)
})

it('shows why Google sign-in stopped and lets the visitor try again', () => {
  render(<AccountControls session={{ status: 'guest' }} callback="denied" />)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Google sign-in was cancelled or denied.',
  )
  expect(
    screen.getByRole('button', { name: 'Sign in with Google' }),
  ).toBeEnabled()
})
