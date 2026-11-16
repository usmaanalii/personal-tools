import { expect, it } from 'vitest'
import { accountDeletionHandler } from '../../account-deletion/handler'

function request(body: unknown, token?: string) {
  return new Request('https://example.com/functions/v1/account-deletion', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

function session() {
  return { accountId: crypto.randomUUID(), sessionId: crypto.randomUUID() }
}

it('requires a POST to confirm deletion', async () => {
  const response = await accountDeletionHandler(new Request('https://example.com/functions/v1/account-deletion'), {
    authenticate: async () => session(),
    confirm: async () => 'deleted',
  })

  expect(response.status).toBe(405)
  expect(response.headers.get('allow')).toBe('POST')
})

it('requires sign-in to confirm account deletion', async () => {
  const response = await accountDeletionHandler(request({ action: 'confirm', intent: crypto.randomUUID() }), {
    authenticate: async () => undefined,
    confirm: async () => 'invalid_intent',
  })

  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: 'authentication_required' })
})

it('rejects a browser-supplied deletion target even from a signed-in session', async () => {
  const response = await accountDeletionHandler(request({
    action: 'confirm',
    intent: crypto.randomUUID(),
    target: crypto.randomUUID(),
  }, 'test-session'), {
    authenticate: async () => session(),
    confirm: async () => 'invalid_intent',
  })

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'invalid_request' })
})

it('rejects confirmation when the intent cannot be claimed by the current session', async () => {
  const response = await accountDeletionHandler(request({
    action: 'confirm', intent: crypto.randomUUID(),
  }, 'test-session'), {
    authenticate: async () => session(),
    confirm: async () => 'invalid_intent',
  })

  expect(response.status).toBe(409)
  expect(await response.json()).toEqual({ error: 'invalid_intent' })
})

it('reports completed deletion only for the intent and authenticated session that succeeded', async () => {
  const signedIn = session()
  const intent = crypto.randomUUID()
  const response = await accountDeletionHandler(request({ action: 'confirm', intent }, 'test-session'), {
    authenticate: async () => signedIn,
    confirm: async (actor, candidate) =>
      actor.accountId === signedIn.accountId &&
      actor.sessionId === signedIn.sessionId &&
      candidate === intent ? 'deleted' : 'invalid_intent',
  })

  expect(response.status).toBe(204)
  expect(await response.text()).toBe('')
})

it('reports a pending result when deletion outcome still needs reconciliation', async () => {
  const response = await accountDeletionHandler(request({
    action: 'confirm', intent: crypto.randomUUID(),
  }, 'test-session'), {
    authenticate: async () => session(),
    confirm: async () => 'pending',
  })

  expect(response.status).toBe(202)
  expect(await response.json()).toEqual({ status: 'pending' })
})

it('returns a safe retryable error when it cannot verify a session', async () => {
  const response = await accountDeletionHandler(request({
    action: 'confirm', intent: crypto.randomUUID(),
  }, 'test-session'), {
    authenticate: async () => { throw new Error('Provider connection details') },
    confirm: async () => 'deleted',
  })

  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'verification_unavailable' })
})

it('returns a safe retryable error when confirmation storage is unavailable', async () => {
  const response = await accountDeletionHandler(request({
    action: 'confirm', intent: crypto.randomUUID(),
  }, 'test-session'), {
    authenticate: async () => session(),
    confirm: async () => { throw new Error('Private database details') },
  })

  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'confirmation_unavailable' })
})
