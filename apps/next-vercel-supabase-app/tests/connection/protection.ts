import type { BrowserContext } from '@playwright/test'

export async function establishBypass(
  context: BrowserContext,
  baseURL: string,
  bypass: string,
  verifiedOrigin: string,
) {
  const target = new URL(baseURL)
  if (
    target.protocol !== 'https:' ||
    !target.hostname.endsWith('.vercel.app') ||
    target.origin !== baseURL ||
    target.origin !== verifiedOrigin
  ) {
    throw new Error('Deployment bypass requires a verified HTTPS origin')
  }
  const response = await context.request.get(target.origin, {
    headers: {
      'x-vercel-protection-bypass': bypass,
      'x-vercel-set-bypass-cookie': 'true',
    },
    maxRedirects: 0,
  })
  const location = response.headers()['location']
  if (location && new URL(location, target.origin).origin !== target.origin) {
    throw new Error(
      'Deployment authentication redirected outside verified origin',
    )
  }
  const cookies = await context.cookies(target.origin)
  if (
    response.status() >= 400 ||
    !cookies.some(
      (cookie) =>
        cookie.name === '_vercel_jwt' &&
        cookie.secure &&
        cookie.domain.replace(/^\./, '') === target.hostname,
    )
  ) {
    throw new Error(
      'Deployment authentication did not establish a scoped cookie',
    )
  }
}
