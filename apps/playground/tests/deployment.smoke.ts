import { expect, test } from '@playwright/test'

// Deployment smoke: no asset replacement or backend response interception.
test('reads Quran content from the deployed app and backend after refresh', async ({ page }) => {
  await page.goto('./quran/')
  await expect(page.getByRole('heading', { name: 'Al-Fatihah', exact: true })).toBeVisible()
  await expect(page.getByRole('article').first()).toBeVisible()
  await expect(page.getByText(/· Quran Foundation/)).toBeVisible()
  await expect(page.getByRole('article').first().getByRole('paragraph').filter({ hasText: /[a-z]/i })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Al-Fatihah', exact: true })).toBeVisible()
  await expect(page.getByRole('article').first()).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('calls the deployed Supabase function through the demo page', async ({ page }) => {
  await page.goto('./supabase/')
  await page.getByRole('button', { name: 'Call the API' }).click()
  await expect(page.getByRole('status')).toHaveText('API request succeeded.')
  await expect(page.getByRole('region', { name: 'API response' })).toContainText('Hello from Supabase!')
})
