import { AuthClient } from '@supabase/auth-js'
import type { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const storageKey = 'next-lab-auth'
const verifierKey = `${storageKey}-code-verifier`
const verifierCookie = 'next-lab-pkce'
export const accessCookie = 'next-lab-access'
export const refreshCookie = 'next-lab-refresh'

export function clearVerifier(response: NextResponse, origin: string) {
  response.cookies.set(verifierCookie, '', {
    httpOnly: true,
    secure: new URL(origin).protocol === 'https:',
    sameSite: 'lax',
    path: '/auth',
    maxAge: 0,
  })
}

const sessionTokens = z.object({
  access_token: z.string().regex(/^[\w.~-]{1,3800}$/),
  refresh_token: z.string().regex(/^[\w.~-]{1,3800}$/),
  expires_in: z.number().int().positive(),
})

export function writeSession(
  response: NextResponse,
  origin: string,
  session: unknown,
) {
  const result = sessionTokens.safeParse(session)
  if (!result.success) return false
  const options = {
    httpOnly: true,
    secure: new URL(origin).protocol === 'https:',
    path: '/',
    sameSite: 'lax',
  } as const
  response.cookies.set(accessCookie, result.data.access_token, {
    ...options,
    maxAge: result.data.expires_in,
  })
  response.cookies.set(refreshCookie, result.data.refresh_token, {
    ...options,
    maxAge: 30 * 24 * 60 * 60,
  })
  return true
}

const configuration = z.object({
  origin: z.url(),
  url: z.url(),
  key: z.string().startsWith('sb_publishable_'),
})

export function getAuthOrigin() {
  const { AUTH_ORIGIN: configuredOrigin } = process.env
  if (!configuredOrigin || !URL.canParse(configuredOrigin)) return undefined
  const url = new URL(configuredOrigin)
  const loopback = ['localhost', '127.0.0.1'].includes(url.hostname)
  if (url.protocol === 'https:' || (url.protocol === 'http:' && loopback)) {
    return url.origin
  }
  return undefined
}

export type AuthCookies = Pick<NextRequest['cookies'], 'get'>

function getConfiguration() {
  const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key } = process.env
  return configuration.safeParse({ origin: getAuthOrigin(), url, key })
}

export function isAuthConfigured() {
  return getConfiguration().success
}

export function createProvider(cookies: AuthCookies, response?: NextResponse) {
  const settings = getConfiguration()
  if (!settings.success) return undefined

  const cookieOptions = {
    httpOnly: true,
    secure: new URL(settings.data.origin).protocol === 'https:',
    sameSite: 'lax',
    path: '/auth',
  } as const

  return new AuthClient({
    url: new URL('/auth/v1', settings.data.url).href,
    headers: { apikey: settings.data.key },
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    storageKey,
    flowType: 'pkce',
    autoRefreshToken: false,
    detectSessionInUrl: false,
    skipAutoInitialize: true,
    storage: {
      // Exact callback allowlists use the SDK's default single verifier key.
      getItem: (name) =>
        name === verifierKey
          ? (cookies.get(verifierCookie)?.value ?? null)
          : null,
      setItem(name, value) {
        if (name === verifierKey) {
          response?.cookies.set(verifierCookie, value, {
            ...cookieOptions,
            maxAge: 600,
          })
        }
      },
      removeItem(name) {
        if (response && name === verifierKey) {
          clearVerifier(response, settings.data.origin)
        }
      },
    },
  })
}
