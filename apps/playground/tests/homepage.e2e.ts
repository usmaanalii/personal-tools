import { expect, test } from '@playwright/test'
import { mockQuranContent } from './quran-fixture'

test('opens the Quran reader when its homepage link is selected on mobile', async ({ page }) => {
  await mockQuranContent(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Supabase API demo/i })).toBeVisible()
  await page.getByRole('link', { name: /Quran reader/i }).click()
  await expect(page.getByRole('heading', { name: 'A moment with the Quran.' })).toBeVisible()
  await expect(page.getByRole('navigation').getByText('Read')).toBeVisible()
  await expect(page.getByRole('navigation').getByText('Saved')).toBeVisible()
  await expect(page).toHaveURL(/\/quran\/$/)

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})
