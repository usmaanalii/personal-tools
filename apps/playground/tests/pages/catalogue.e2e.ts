import { expect, test } from '@playwright/test'
import { mockQuranContent } from '../prototypes/quran/content-fixture'

test('opens a shared button through Storybook and refreshes its direct link', async ({ page }) => {
  // Served-app risk: the manager must load its index and iframe assets under the nested prefix.
  await page.goto('./storybook/?path=/story/controls-button--default')
  const preview = page.frameLocator('iframe[title="storybook-preview-iframe"]')
  await expect(preview.getByRole('button', { name: 'Check connection', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Retry', exact: true }).click()
  await expect(preview.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
  // Browser risk: Pages has no SPA fallback; query-based deep links must survive a fresh load.
  await page.reload()
  await expect(preview.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
})

for (const [route, heading] of [
  ['./', 'Playground'],
  ['./quran/', 'A moment with the Quran.'],
  ['./supabase/', 'Hello from GitHub Pages'],
]) {
  test(`preserves direct loading and refresh of ${route} in the combined artifact`, async ({ page }) => {
    // Assembly risk: publishing the catalogue must retain each existing static entry and its assets.
    // Only the page shell is checked; this is not evidence of backend connectivity.
    if (route === './quran/' && !process.env.PLAYWRIGHT_BASE_URL) await mockQuranContent(page)
    await page.goto(route)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  })
}
