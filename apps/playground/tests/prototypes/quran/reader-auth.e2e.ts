import { createHash } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
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

test('returns from an email link to the static reader in the browser that requested it', async ({ page, baseURL }) => {
  await mockQuranContent(page)
  const reader = new URL('quran/', baseURL).href
  let challenge: string | undefined
  await page.route('**/auth/v1/otp?**', async route => {
    expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe(reader)
    const request = route.request().postDataJSON()
    challenge = request.code_challenge
    await route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: {} })
  })
  await page.route('**/auth/v1/token?grant_type=pkce', async route => {
    const { auth_code, code_verifier } = route.request().postDataJSON()
    expect(auth_code).toBe('email-fixture')
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
  await page.getByRole('button', { name: 'Sign in with email' }).press('Enter')
  const email = page.getByRole('textbox', { name: 'Email address' })
  await expect(email).toBeFocused()
  expect((await new AxeBuilder({ page }).include('[aria-label="Reader account"]').analyze()).violations).toEqual([])
  await email.fill('reader@example.test')
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  await expect(page.getByText(/if a link can be sent/i)).toBeVisible()
  await page.goto(`${reader}?code=email-fixture`)
  await expect(page.getByText('reader@example.test')).toBeVisible()
  await expect(page).toHaveURL(reader)
})

test('opens the deletion dialog from a static callback and restores keyboard focus on Escape', async ({ page, baseURL }) => {
  await mockQuranContent(page)
  const reader = new URL('quran/', baseURL).href
  await page.route('**/auth/v1/authorize?**', route =>
    route.fulfill({ status: 302, headers: { location: `${reader}?code=sign-in-fixture` } }),
  )
  await page.route('**/auth/v1/token?grant_type=pkce', route => route.fulfill({
    headers: { 'access-control-allow-origin': '*' },
    json: {
      access_token: 'access-fixture',
      refresh_token: 'refresh-fixture',
      expires_in: 3600,
      user: { id: 'cde32903-8a24-4ade-9c2c-9c31cdee3a91', email: 'reader@example.test' },
    },
  }))
  const actions: string[] = []
  await page.route('**/functions/v1/account-deletion', route => {
    const { action } = route.request().postDataJSON()
    actions.push(action)
    return route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { status: action === 'verify' ? 'verified' : 'cancelled' },
    })
  })
  await page.goto(reader)
  await page.getByRole('button', { name: 'Sign in with Google' }).press('Enter')
  await expect(page.getByText('reader@example.test')).toBeVisible()

  await page.goto(`${reader}?deletion_intent=fd9f47dd-9ae2-4e04-afbb-f15b3465c24b&code=proof-fixture`)
  const dialog = page.getByRole('dialog', { name: 'Delete account' })
  const cancel = dialog.getByRole('button', { name: 'Cancel' })
  const confirm = dialog.getByRole('button', { name: 'Permanently delete account' })
  await expect(cancel).toBeFocused()
  await expect(page).toHaveURL(reader)
  await expect(confirm).toBeInViewport()
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([])

  await page.keyboard.press('Shift+Tab')
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Delete account' })).toBeFocused()
  await expect(page.getByText('reader@example.test')).toBeVisible()
  expect(actions).toEqual(['verify', 'cancel'])
})
