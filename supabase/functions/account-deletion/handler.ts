import { z } from 'zod'

export type AccountDeletionSession = {
  readonly accountId: string
  readonly sessionId: string
}

type Dependencies = {
  readonly authenticate: (token: string) => Promise<AccountDeletionSession | undefined>
  readonly confirm: (session: AccountDeletionSession, intent: string) => Promise<'deleted' | 'invalid_intent' | 'pending'>
}

const confirmation = z.strictObject({ action: z.literal('confirm'), intent: z.uuid() })

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
  const parsed = confirmation.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const result = await dependencies.confirm(session, parsed.data.intent).catch((): 'unavailable' => 'unavailable')
  if (result === 'unavailable') {
    return Response.json({ error: 'confirmation_unavailable' }, { status: 503 })
  }
  if (result === 'deleted') return new Response(null, { status: 204 })
  if (result === 'pending') return Response.json({ status: result }, { status: 202 })
  return Response.json({ error: result }, { status: 409 })
}
