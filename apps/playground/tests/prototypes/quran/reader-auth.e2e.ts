import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { mockQuranContent } from './content-fixture'

test('returns from Google sign-in to the static reader and restores the session on reload', async ({ page, baseURL }) => {
  await mockQuranContent(page)
  const reader = new URL('quran/', baseURL).href
  let challenge: string | null = null
  await page.route('**/auth/v1/authorize?**', async route => {
    const params = new URL(route.request().url()).searchParams
    expect(params.get('provider')).toBe('google')
    expect(params.get('redirect_to')).toBe(reader)
    challenge = params.get('code_challenge')
    await route.fulfill({ status: 302, headers: { location: `${reader}?code=browser-fixture` } })
  })
  await page.route('**/auth/v1/token?grant_type=pkce', async route => {
    const request = route.request()
    expect(request.postDataJSON()).toMatchObject({ auth_code: 'browser-fixture' })
    const { code_verifier } = request.postDataJSON()
    expect(createHash('sha256').update(code_verifier).digest('base64url')).toBe(challenge)
    await route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: {
        access_token: 'access-fixture',
        refresh_token: 'refresh-fixture',
        expires_in: 3600,
        user: { id: 'cde32903-8a24-4ade-9c2c-9c31cdee3a91', email: 'reader@example.test' },
      },
    })
  })

  await page.goto(reader)
  await page.getByRole('button', { name: 'Sign in with Google' }).press('Enter', { timeout: 5_000 })

  await expect(page.getByText('reader@example.test')).toBeVisible()
  await expect(page).toHaveURL(reader)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Verses' })).toBeVisible()
})
