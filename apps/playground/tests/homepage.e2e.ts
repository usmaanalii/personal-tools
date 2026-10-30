import { expect, test } from '@playwright/test'
import { mockQuranContent } from './quran-fixture'

test('opens the Quran reader when its homepage link is selected', async ({ page, isMobile }) => {
  await mockQuranContent(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Supabase API demo/i })).toBeVisible()
  await page.getByRole('link', { name: /Quran reader/i }).click()
  await expect(page.getByRole('heading', { name: 'A moment with the Quran.' })).toBeVisible()
  if (isMobile) {
    await expect(page.getByRole('navigation').getByText('Read')).toBeVisible()
    await expect(page.getByRole('navigation').getByText('Saved')).toBeVisible()
  }
  await expect(page).toHaveURL(/\/quran\/$/)

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})
