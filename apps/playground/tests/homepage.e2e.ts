import { expect, test } from '@playwright/test'

test('the homepage explains the API demo', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Hello from GitHub Pages' })).toBeVisible()
  await expect(
    page.getByText('This page calls a Supabase Edge Function with a GET request.'),
  ).toBeVisible()
})

test('the API call starts in the idle state', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Call the API' })).toBeEnabled()
  await expect(page.getByRole('status')).toContainText('Click the button to test it.')
  await expect(page.getByLabel('API response')).toHaveText('API response will appear here.')
})
