import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('keeps Google sign-in across direct loads and signs out', async ({
  page,
  browser,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in with Google' }).click()
  await expect(page.getByText('Signed in as reader@example.test')).toBeVisible()
  const origin = new URL(page.url()).origin
  expect(page.url()).toBe(`${origin}/#account`)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

  const guest = await browser.newPage({ baseURL: origin })
  try {
    await guest.goto('/')
    await expect(
      guest.getByRole('button', { name: 'Sign in with Google' }),
    ).toBeVisible()
  } finally {
    await guest.close()
  }

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('button', { name: 'Sign in with Google' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Sign in with Google' }),
  ).toBeVisible()
})

test('opens the email link through the production callback and restores the session', async ({
  page,
  request,
}, testInfo) => {
  const address = `reader-${testInfo.project.name}@example.test`
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in with email' }).click()
  const email = page.getByRole('textbox', { name: 'Email address' })
  await expect(email).toBeFocused()
  expect(
    (await new AxeBuilder({ page }).include('#account').analyze()).violations,
  ).toEqual([])
  await email.fill(address)
  await page.getByRole('button', { name: 'Send sign-in link' }).click()
  await expect(page.getByText(/if a link can be sent/i)).toBeVisible()

  const mailbox = new URL('http://127.0.0.1:54329/test/email-link')
  mailbox.searchParams.set('email', address)
  const message = await request.get(mailbox.href)
  expect(message.ok()).toBe(true)
  const { link } = await message.json()
  await page.goto(link)
  await expect(page.getByText('Signed in as reader@example.test')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})
