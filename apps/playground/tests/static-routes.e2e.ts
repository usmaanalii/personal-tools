import { expect, test } from '@playwright/test'

// Harness contract: missing built pages must not be hidden by an SPA fallback.
test('returns 404 for a missing static page instead of an SPA fallback', async ({ page }) => {
  const response = await page.goto('./missing-page/')
  expect(response?.status()).toBe(404)
})
