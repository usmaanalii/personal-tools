import type { Session } from '@scratch-pages/auth'
import { z } from 'zod'
import { accessCookie, type AuthCookies, createProvider } from './provider'

const identity = z.object({
  id: z.string().min(1),
  email: z.email().optional(),
  is_anonymous: z.literal(false).optional(),
})

export async function readSession(cookies: AuthCookies): Promise<Session> {
  const token = cookies.get(accessCookie)?.value
  if (!token) return { status: 'guest' }

  const provider = createProvider(cookies)
  if (!provider) return { status: 'guest' }

  const { data, error } = await provider.getUser(token)
  const verified = identity.safeParse(data.user)
  if (error || !verified.success) return { status: 'guest' }

  const { id, email } = verified.data
  return {
    status: 'authenticated',
    identity: { id, label: email ?? 'Signed in' },
  }
}
