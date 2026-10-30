import { expect, test } from '@playwright/test'

test('opens the homepage when All playground pages is selected from the Supabase demo', async ({ page }) => {
  await page.goto('/supabase/')

  await expect(page.getByRole('heading', { name: 'Hello from GitHub Pages' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Call the API' })).toBeVisible()
  await page.getByRole('link', { name: /All playground pages/i }).click()
  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
})
