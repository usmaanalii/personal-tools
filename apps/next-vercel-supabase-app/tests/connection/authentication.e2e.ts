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
