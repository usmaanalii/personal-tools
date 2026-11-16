import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import App from '../../app/app'
import type { Auth, EmailLinkAuth, Session } from '@scratch-pages/auth'
import type { CallbackResult } from '../../app/auth-callback'
import { createSupabaseAuth } from '../../app/supabase-auth'
import { quranEndpoint, server } from '../../test-server'

afterEach(() => window.history.replaceState({}, '', '/'))

function renderWithSession(initial: Session, {
  signIn = vi.fn(async () => {}),
  callback,
  signOut,
  requestEmailLink,
}: { signIn?: Auth['signIn']; callback?: Promise<CallbackResult>; signOut?: Auth['signOut']; requestEmailLink?: EmailLinkAuth['requestEmailLink'] } = {}) {
  const listeners = new Set<(session: Session) => void>()
  const publish = (session: Session) => listeners.forEach(listener => { listener(session) })
  const user = userEvent.setup()
  window.history.pushState({}, '', '/quran/')
  render(<App auth={{
    callback,
    requestEmailLink,
    observeSession(listener) {
      listeners.add(listener)
      listener(initial)
      return () => { listeners.delete(listener) }
    },
    signIn,
    signOut: signOut ?? (async () => publish({ status: 'guest' })),
  }} />)
  return { user, signIn, publish }
}

it('lets a guest read the Quran and choose to sign in with Google', async () => {
  const signIn = vi.fn(async () => {})
  const { user } = renderWithSession({ status: 'guest' }, { signIn })
  expect(await screen.findByRole('heading', { name: 'Al-Fātiḥah' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Sign in with Google' }))

  expect(signIn).toHaveBeenCalledOnce()
  expect(screen.getByRole('region', { name: 'Verses' })).toBeVisible()
})

it('lets a guest request an email link while keeping the reader available', async () => {
  const requestEmailLink = vi.fn<EmailLinkAuth['requestEmailLink']>().mockResolvedValue('accepted')
  const { user } = renderWithSession({ status: 'guest' }, { requestEmailLink })
  await user.click(await screen.findByRole('button', { name: 'Sign in with email' }))
  await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'reader@example.test')
  await user.click(screen.getByRole('button', { name: 'Send sign-in link' }))

  expect(requestEmailLink).toHaveBeenCalledExactlyOnceWith('reader@example.test')
  expect(await screen.findByText(/if a link can be sent/i)).toBeVisible()
  expect(screen.getByRole('region', { name: 'Verses' })).toBeVisible()
})

it('cleans an expired email link and offers a new request without interrupting reading', async () => {
  window.history.pushState({}, '', '/quran/?error=access_denied&error_code=otp_expired&error_description=provider-details')
  const auth = createSupabaseAuth({
    supabaseUrl: 'https://auth.example',
    supabasePublishableKey: 'fixture-key',
    redirectTo: new URL('/quran/', window.location.origin).href,
  })
  render(<App auth={auth} />)

  expect(await screen.findByRole('alert')).toHaveTextContent('This sign-in link is invalid or expired. Request a new link.')
  expect(window.location.search).toBe('')
  expect(await screen.findByRole('button', { name: 'Sign in with email' })).toBeEnabled()
  expect(await screen.findByRole('region', { name: 'Verses' })).toBeVisible()
})

it('replaces the prior identity when the active account changes', async () => {
  const { publish } = renderWithSession({ status: 'authenticated', identity: { id: 'first', label: 'First reader' } })
  expect(await screen.findByText('First reader')).toBeVisible()

  act(() => publish({ status: 'authenticated', identity: { id: 'second', label: 'Second reader' } }))

  expect(screen.getByText('Second reader')).toBeVisible()
  expect(screen.queryByText('First reader')).not.toBeInTheDocument()
})

it('returns to guest reading after sign-out', async () => {
  const { user } = renderWithSession({ status: 'authenticated', identity: { id: 'reader', label: 'Reader account' } })
  await user.click(await screen.findByRole('button', { name: 'Sign out' }))

  expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled()
  expect(screen.queryByText('Reader account')).not.toBeInTheDocument()
  expect(await screen.findByRole('region', { name: 'Verses' })).toBeVisible()
})

it('offers a retry when sign-in fails without showing provider details', async () => {
  const pending = Promise.withResolvers<void>()
  const signIn = vi.fn(() => pending.promise)
  const { user } = renderWithSession({ status: 'guest' }, { signIn })
  const signInButton = await screen.findByRole('button', { name: 'Sign in with Google' })
  await user.click(signInButton)
  expect(signInButton).toBeDisabled()

  await act(async () => {
    pending.reject(new Error('private provider details'))
    await pending.promise.catch(() => {})
  })

  expect(screen.getByRole('alert')).toHaveTextContent('Could not start sign-in. Try again.')
  expect(screen.queryByText(/private provider details/)).not.toBeInTheDocument()
  expect(signInButton).toBeEnabled()
})

it('lets a reader continue after cancelling Google sign-in', async () => {
  const incoming = Promise.withResolvers<CallbackResult>()
  renderWithSession({ status: 'guest' }, { callback: incoming.promise })
  expect(await screen.findByText('Finishing sign-in…')).toBeVisible()

  await act(() => incoming.resolve('cancelled'))

  expect(screen.getByText('Sign-in was cancelled.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled()
  expect(await screen.findByRole('region', { name: 'Verses' })).toBeVisible()
})

it('keeps the current account and offers retry when sign-out fails', async () => {
  const pending = Promise.withResolvers<void>()
  const { user } = renderWithSession(
    { status: 'authenticated', identity: { id: 'reader', label: 'Reader account' } },
    { signOut: () => pending.promise },
  )
  const signOut = await screen.findByRole('button', { name: 'Sign out' })
  await user.click(signOut)
  expect(signOut).toBeDisabled()
  await act(async () => {
    pending.reject(new Error('provider details'))
    await pending.promise.catch(() => {})
  })

  expect(screen.getByRole('alert')).toHaveTextContent('Could not sign out. Try again.')
  expect(screen.getByText('Reader account')).toBeVisible()
  expect(signOut).toBeEnabled()
})

it('offers a fresh sign-in when the callback fails even if chapters are unavailable', async () => {
  server.use(http.get(`${quranEndpoint}/chapters`, () => HttpResponse.json({}, { status: 503 })))
  renderWithSession({ status: 'guest' }, { callback: Promise.resolve('failed') })

  expect(await screen.findByText('Could not finish sign-in. Try again.')).toHaveAttribute('role', 'alert')
  expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled()
  expect(await screen.findByRole('button', { name: 'Retry chapters' })).toBeVisible()
})

it('allows another sign-in after the browser restores the reader with Back', async () => {
  const { user } = renderWithSession({ status: 'guest' })
  const signIn = await screen.findByRole('button', { name: 'Sign in with Google' })
  await user.click(signIn)
  expect(signIn).toBeDisabled()

  act(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })) })

  expect(signIn).toBeEnabled()
})
