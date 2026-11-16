export type CallbackResult = 'complete' | 'cancelled' | 'failed' | 'link-expired'

type Callback = { readonly code: string } | Exclude<CallbackResult, 'complete'> | undefined

const callbackFields = [
  'code', 'error', 'error_code', 'error_description', 'sb_flow_id',
  'access_token', 'refresh_token', 'provider_token', 'provider_refresh_token',
  'token_type', 'expires_in', 'expires_at',
] as const

export function takeAuthCallback(): Callback {
  const url = new URL(window.location.href)
  const query = url.searchParams
  const fragment = new URLSearchParams(url.hash.slice(1))
  const hasQuery = callbackFields.some(field => query.has(field))
  const hasFragment = callbackFields.some(field => fragment.has(field))
  if (!hasQuery && !hasFragment) return undefined

  const [code] = query.getAll('code')
  const expired = query.get('error_code') === 'otp_expired' || fragment.get('error_code') === 'otp_expired'
  const denied = query.get('error') === 'access_denied' || fragment.get('error') === 'access_denied'
  const validCode = code && !hasFragment && callbackFields.every(field =>
    field === 'code' ? query.getAll(field).length === 1 : !query.has(field),
  )
  for (const field of callbackFields) query.delete(field)
  if (hasFragment) url.hash = ''
  window.history.replaceState(window.history.state, '', url)

  if (expired) return 'link-expired'
  if (denied) return 'cancelled'
  return validCode ? { code } : 'failed'
}
