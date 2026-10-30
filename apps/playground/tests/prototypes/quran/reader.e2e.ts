import { expect, test } from '@playwright/test'
import { mockQuranContent } from './content-fixture'

test('opens the Quran reader when its homepage link is selected', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Supabase API demo/i })).toBeVisible()
  await page.getByRole('link', { name: /Quran reader/i }).click()
  await expect(page.getByRole('heading', { name: 'A moment with the Quran.' })).toBeVisible()
  await expect(page).toHaveURL(/\/quran\/$/)
  await expect(page.getByRole('article').first()).toBeVisible()
  await page.reload()
  await expect(page.getByRole('article').first()).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})
