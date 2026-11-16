import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { AccountControls } from './account-controls'
import type { EmailLinkAuth } from '@scratch-pages/auth'

it('lets a guest request email sign-in from the account section', async () => {
  const actions = {
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    requestEmailLink: vi
      .fn<EmailLinkAuth['requestEmailLink']>()
      .mockResolvedValue('accepted'),
  }
  const user = userEvent.setup()
  render(<AccountControls session={{ status: 'guest' }} actions={actions} />)
  await user.click(screen.getByRole('button', { name: 'Sign in with email' }))
  const email = screen.getByRole('textbox', { name: 'Email address' })
  expect(email).toHaveAccessibleDescription(/same account/i)
  await user.type(email, 'reader@example.test')
  await user.click(screen.getByRole('button', { name: 'Send sign-in link' }))
  expect(actions.requestEmailLink).toHaveBeenCalledExactlyOnceWith(
    'reader@example.test',
  )
  expect(await screen.findByText(/if a link can be sent/i)).toBeVisible()
})

it('moves keyboard focus into the email form and restores it on cancellation', async () => {
  const actions = {
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    requestEmailLink: vi.fn<EmailLinkAuth['requestEmailLink']>(),
  }
  const user = userEvent.setup()
  render(<AccountControls session={{ status: 'guest' }} actions={actions} />)
  const open = screen.getByRole('button', { name: 'Sign in with email' })
  await user.click(open)
  const email = screen.getByRole('textbox', { name: 'Email address' })
  expect(email).toHaveFocus()
  await user.type(email, 'reader@example.test')
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(open).toHaveFocus()
  expect(screen.queryByRole('textbox', { name: 'Email address' })).toBeNull()
  expect(actions.requestEmailLink).not.toHaveBeenCalled()
})

it('keeps the email address and offers a retry after throttling', async () => {
  const actions = {
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    requestEmailLink: vi
      .fn<EmailLinkAuth['requestEmailLink']>()
      .mockResolvedValueOnce('rate-limited')
      .mockResolvedValue('accepted'),
  }
  const user = userEvent.setup()
  render(<AccountControls session={{ status: 'guest' }} actions={actions} />)
  await user.click(screen.getByRole('button', { name: 'Sign in with email' }))
  const email = screen.getByRole('textbox', { name: 'Email address' })
  await user.type(email, 'reader@example.test')
  const send = screen.getByRole('button', { name: 'Send sign-in link' })
  await user.click(send)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /too many requests/i,
  )
  expect(email).toHaveValue('reader@example.test')
  await user.click(send)
  expect(
    await screen.findByRole('button', { name: 'Resend sign-in link' }),
  ).toBeEnabled()
})

it('keeps an offline guest in the form so they can retry when connected', async () => {
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
  const actions = {
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    requestEmailLink: vi.fn<EmailLinkAuth['requestEmailLink']>(),
  }
  const user = userEvent.setup()
  render(<AccountControls session={{ status: 'guest' }} actions={actions} />)
  await user.click(screen.getByRole('button', { name: 'Sign in with email' }))
  await user.type(
    screen.getByRole('textbox', { name: 'Email address' }),
    'reader@example.test',
  )
  await user.click(screen.getByRole('button', { name: 'Send sign-in link' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/you’re offline/i)
  expect(actions.requestEmailLink).not.toHaveBeenCalled()
})

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

it('offers a new link when an email sign-in link has expired', () => {
  render(
    <AccountControls session={{ status: 'guest' }} callback="link-expired" />,
  )
  expect(screen.getByRole('alert')).toHaveTextContent(
    'This sign-in link is invalid or expired. Request a new link.',
  )
  expect(
    screen.getByRole('button', { name: 'Sign in with email' }),
  ).toBeEnabled()
})
