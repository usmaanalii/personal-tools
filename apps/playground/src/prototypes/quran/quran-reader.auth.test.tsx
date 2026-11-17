import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import App from '../../app/app'
import type { Auth, EmailLinkAuth, Session } from '@scratch-pages/auth'
import type { CallbackResult } from '../../app/auth-callback'
import { createSupabaseAuth } from '../../app/supabase-auth'
import { quranEndpoint, server } from '../../test-server'

afterEach(() => {
  window.history.replaceState({}, '', '/')
  localStorage.clear()
})

const deletionIntent = 'fd9f47dd-9ae2-4e04-afbb-f15b3465c24b'

async function signInForAccountDeletion() {
  const config = {
    supabaseUrl: 'https://auth.example',
    supabasePublishableKey: 'fixture-key',
    redirectTo: new URL('/quran/', window.location.origin).href,
    accountDeletionEnabled: true,
  }
  server.use(http.post(`${config.supabaseUrl}/auth/v1/token`, () => HttpResponse.json({
    access_token: 'access-fixture',
    refresh_token: 'refresh-fixture',
    expires_in: 3600,
    user: { id: 'cde32903-8a24-4ade-9c2c-9c31cdee3a91', email: 'reader@example.test' },
  })))
  await createSupabaseAuth({ ...config, navigate: () => {} }).signIn()
  window.history.replaceState({}, '', '/quran/?code=sign-in-fixture')
  expect(await createSupabaseAuth(config).callback).toBe('complete')
  return config
}

it('requests a deletion link for the signed-in account before offering permanent deletion', async () => {
  const config = await signInForAccountDeletion()
  const requested = vi.fn()
  server.use(http.post(`${config.supabaseUrl}/functions/v1/account-deletion`, async ({ request }) => {
    requested(request.headers.get('authorization'), await request.json())
    return HttpResponse.json({ status: 'sent', intent: deletionIntent }, { status: 201 })
  }))
  const user = userEvent.setup()
  render(<App auth={createSupabaseAuth(config)} />)

  await user.click(await screen.findByRole('button', { name: 'Delete account' }))
  const dialog = screen.getByRole('dialog', { name: 'Delete account' })
  expect(within(dialog).getByText(/reader@example.test/)).toBeVisible()
  await user.click(within(dialog).getByRole('button', { name: 'Send verification link' }))

  expect(await within(dialog).findByRole('status')).toHaveTextContent('Open the link in this browser')
  expect(requested).toHaveBeenCalledExactlyOnceWith('Bearer access-fixture', {
    action: 'begin', app: 'playground',
  })
  expect(within(dialog).queryByRole('button', { name: 'Permanently delete account' })).not.toBeInTheDocument()
})

it('explains when the reader can request another deletion link after throttling', async () => {
  const config = await signInForAccountDeletion()
  server.use(http.post(`${config.supabaseUrl}/functions/v1/account-deletion`, () =>
    HttpResponse.json({ error: 'rate_limited' }, { status: 429 }),
  ))
  const user = userEvent.setup()
  render(<App auth={createSupabaseAuth(config)} />)

  await user.click(await screen.findByRole('button', { name: 'Delete account' }))
  const dialog = screen.getByRole('dialog', { name: 'Delete account' })
  await user.click(within(dialog).getByRole('button', { name: 'Send verification link' }))

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Wait a minute before requesting another verification link.')
})

it('returns as a guest only after confirming permanent deletion from a verified link', async () => {
  const config = await signInForAccountDeletion()
  const commands = vi.fn()
  server.use(
    http.post<never, { readonly action: string }>(`${config.supabaseUrl}/functions/v1/account-deletion`, async ({ request }) => {
      const body = await request.json()
      commands(body)
      return body?.action === 'verify'
        ? HttpResponse.json({ status: 'verified' })
        : new HttpResponse(null, { status: 204 })
    }),
    http.post(`${config.supabaseUrl}/auth/v1/logout`, () => new HttpResponse(null, { status: 403 })),
  )
  window.history.replaceState({}, '', `/quran/?deletion_intent=${deletionIntent}&code=proof-fixture`)
  const user = userEvent.setup()
  render(<App auth={createSupabaseAuth(config)} />)

  const dialog = await screen.findByRole('dialog', { name: 'Delete account' })
  expect(commands).toHaveBeenCalledExactlyOnceWith({ action: 'verify', intent: deletionIntent, code: 'proof-fixture' })
  await user.click(within(dialog).getByRole('button', { name: 'Permanently delete account' }))

  expect(await screen.findByText('Account deleted.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled()
  expect(screen.queryByText('reader@example.test')).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Verses' })).toBeVisible()
  expect(commands).toHaveBeenLastCalledWith({ action: 'confirm', intent: deletionIntent })
  expect(commands).toHaveBeenCalledTimes(2)
})

it('invalidates a sent deletion link when the reader cancels', async () => {
  const config = await signInForAccountDeletion()
  const commands = vi.fn()
  server.use(http.post<never, { readonly action: string }>(`${config.supabaseUrl}/functions/v1/account-deletion`, async ({ request }) => {
    const body = await request.json()
    commands(body)
    return body?.action === 'begin'
      ? HttpResponse.json({ status: 'sent', intent: deletionIntent }, { status: 201 })
      : HttpResponse.json({ status: 'cancelled' })
  }))
  const user = userEvent.setup()
  render(<App auth={createSupabaseAuth(config)} />)

  await user.click(await screen.findByRole('button', { name: 'Delete account' }))
  const dialog = screen.getByRole('dialog', { name: 'Delete account' })
  await user.click(within(dialog).getByRole('button', { name: 'Send verification link' }))
  expect(await within(dialog).findByText(/open the link in this browser/i)).toBeVisible()
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

  expect(await screen.findByText('Account deletion cancelled.')).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText('reader@example.test')).toBeVisible()
  expect(commands).toHaveBeenLastCalledWith({ action: 'cancel', intent: deletionIntent })
  expect(commands).toHaveBeenCalledTimes(2)
})

it('reports a pending deletion without offering another confirmation', async () => {
  const config = await signInForAccountDeletion()
  const confirmation = vi.fn()
  server.use(http.post<never, { readonly action: string }>(`${config.supabaseUrl}/functions/v1/account-deletion`, async ({ request }) => {
    const body = await request.json()
    if (body?.action === 'verify') return HttpResponse.json({ status: 'verified' })
    confirmation(body)
    return HttpResponse.json({ status: 'pending' }, { status: 202 })
  }))
  window.history.replaceState({}, '', `/quran/?deletion_intent=${deletionIntent}&code=proof-fixture`)
  const user = userEvent.setup()
  render(<App auth={createSupabaseAuth(config)} />)

  const dialog = await screen.findByRole('dialog', { name: 'Delete account' })
  await user.click(within(dialog).getByRole('button', { name: 'Permanently delete account' }))

  expect(await within(dialog).findByText('Account deletion is still pending.')).toBeVisible()
  expect(within(dialog).queryByRole('button', { name: 'Permanently delete account' })).not.toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.getByText('Account deletion is still pending.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Delete account' })).toBeDisabled()
  expect(screen.getByText('reader@example.test')).toBeVisible()
  expect(confirmation).toHaveBeenCalledExactlyOnceWith({ action: 'confirm', intent: deletionIntent })
})

it('offers a fresh request when a deletion link has expired', async () => {
  const config = await signInForAccountDeletion()
  window.history.replaceState({}, '', `/quran/?deletion_intent=${deletionIntent}&error_code=otp_expired`)
  render(<App auth={createSupabaseAuth(config)} />)

  expect(await screen.findByText('This deletion link is invalid or expired. Request a new link from your account.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Delete account' })).toBeEnabled()
  expect(screen.getByText('reader@example.test')).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(window.location.search).toBe('')
})

it.each(['Permanently delete account', 'Cancel'])('lets the reader start over when the request expires before %s', async button => {
  const config = await signInForAccountDeletion()
  server.use(http.post<never, { readonly action: string }>(`${config.supabaseUrl}/functions/v1/account-deletion`, async ({ request }) => {
    const { action } = await request.json()
    return action === 'verify'
      ? HttpResponse.json({ status: 'verified' })
      : HttpResponse.json({ error: 'invalid_intent' }, { status: 409 })
  }))
  window.history.replaceState({}, '', `/quran/?deletion_intent=${deletionIntent}&code=proof-fixture`)
  const user = userEvent.setup()
  render(<App auth={createSupabaseAuth(config)} />)

  const dialog = await screen.findByRole('dialog', { name: 'Delete account' })
  await user.click(within(dialog).getByRole('button', { name: button }))

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('This deletion request is no longer valid.')
  expect(within(dialog).queryByRole('button', { name: 'Permanently delete account' })).not.toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Close' }))
  await user.click(screen.getByRole('button', { name: 'Delete account' }))
  expect(screen.getByRole('button', { name: 'Send verification link' })).toBeEnabled()
})

it('lets the reader leave the dialog when the server cannot confirm cancellation', async () => {
  const config = await signInForAccountDeletion()
  server.use(http.post<never, { readonly action: string }>(`${config.supabaseUrl}/functions/v1/account-deletion`, async ({ request }) => {
    const { action } = await request.json()
    return action === 'verify'
      ? HttpResponse.json({ status: 'verified' })
      : HttpResponse.json({ error: 'confirmation_unavailable' }, { status: 503 })
  }))
  window.history.replaceState({}, '', `/quran/?deletion_intent=${deletionIntent}&code=proof-fixture`)
  const user = userEvent.setup()
  render(<App auth={createSupabaseAuth(config)} />)

  const dialog = await screen.findByRole('dialog', { name: 'Delete account' })
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('The verification link may still be valid.')
  await user.click(within(dialog).getByRole('button', { name: 'Close' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Verses' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Delete account' }))
  expect(screen.getByRole('button', { name: 'Retry cancellation' })).toBeEnabled()
})

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
