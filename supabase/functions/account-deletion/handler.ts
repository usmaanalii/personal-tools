import { z } from 'zod'

export type AccountDeletionSession = {
  readonly accountId: string
  readonly sessionId: string
}

type Dependencies = {
  readonly authenticate: (token: string) => Promise<AccountDeletionSession | undefined>
  readonly confirm: (session: AccountDeletionSession, intent: string) => Promise<'deleted' | 'invalid_intent' | 'pending'>
  readonly begin?: (session: AccountDeletionSession, app: 'playground' | 'next') =>
    Promise<{ readonly status: 'sent'; readonly intent: string } | { readonly status: 'invalid_intent' | 'rate_limited' }>
  readonly verify?: (session: AccountDeletionSession, intent: string, code: string) =>
    Promise<'verified' | 'invalid_intent'>
  readonly cancel?: (session: AccountDeletionSession, intent: string) => Promise<'cancelled' | 'invalid_intent' | 'pending'>
}

const command = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('confirm'), intent: z.uuid() }),
  z.strictObject({ action: z.literal('begin'), app: z.enum(['playground', 'next']) }),
  z.strictObject({ action: z.literal('verify'), intent: z.uuid(), code: z.string().min(1).max(512) }),
  z.strictObject({ action: z.literal('cancel'), intent: z.uuid() }),
])

export async function accountDeletionHandler(
  request: Request,
  dependencies: Dependencies,
): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { allow: 'POST' } })
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  const session = token
    ? await dependencies.authenticate(token).catch((): 'unavailable' => 'unavailable')
    : undefined
  if (session === 'unavailable') {
    return Response.json({ error: 'verification_unavailable' }, { status: 503 })
  }
  if (!session) {
    return Response.json({ error: 'authentication_required' }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => undefined)
  const parsed = command.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (parsed.data.action === 'begin') {
    const result = await dependencies.begin?.(session, parsed.data.app).catch(() => undefined)
    if (!result) return Response.json({ error: 'verification_unavailable' }, { status: 503 })
    if (result.status === 'sent') return Response.json(result, { status: 201 })
    return Response.json({ error: result.status }, { status: result.status === 'rate_limited' ? 429 : 409 })
  }

  if (parsed.data.action === 'verify') {
    const result = await dependencies.verify?.(session, parsed.data.intent, parsed.data.code).catch(() => undefined)
    if (!result) return Response.json({ error: 'verification_unavailable' }, { status: 503 })
    if (result === 'verified') return Response.json({ status: result })
    return Response.json({ error: result }, { status: 409 })
  }

  if (parsed.data.action === 'cancel') {
    const result = await dependencies.cancel?.(session, parsed.data.intent).catch(() => undefined)
    if (!result) return Response.json({ error: 'confirmation_unavailable' }, { status: 503 })
    if (result === 'cancelled') return Response.json({ status: result })
    if (result === 'pending') return Response.json({ status: result }, { status: 202 })
    return Response.json({ error: result }, { status: 409 })
  }

  const result = await dependencies.confirm(session, parsed.data.intent).catch((): 'unavailable' => 'unavailable')
  if (result === 'unavailable') {
    return Response.json({ error: 'confirmation_unavailable' }, { status: 503 })
  }
  if (result === 'deleted') return new Response(null, { status: 204 })
  if (result === 'pending') return Response.json({ status: result }, { status: 202 })
  return Response.json({ error: result }, { status: 409 })
}
