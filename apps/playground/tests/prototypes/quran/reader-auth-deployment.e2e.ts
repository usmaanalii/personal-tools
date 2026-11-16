import { expect, test } from '@playwright/test'

test('offers Google sign-in to guests on the deployed Quran reader', async ({ page }) => {
  await page.goto('./quran/')
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
})
