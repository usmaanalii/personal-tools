import { expect, test } from '@playwright/test'

// Deployment smoke: real deployed assets and backend responses.
test('calls the deployed Supabase function through the demo page', async ({ page }) => {
  await page.goto('./supabase/')
  await page.getByRole('button', { name: 'Call the API' }).click()
  await expect(page.getByRole('status')).toHaveText('API request succeeded.')
  await expect(page.getByRole('region', { name: 'API response' })).toContainText('Hello from Supabase!')
})
