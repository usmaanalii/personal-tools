import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockQuranContent } from './content-fixture'

test('opens the Quran reader when its homepage link is selected', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
  // Browser risk: production styles, native Tab order and Enter navigation at both viewport sizes.
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: /Quran reader/i })).toBeFocused()
  await page.keyboard.press('Enter')
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

  // Browser risk: generated styles must keep the whole reader, including verse content, accessible.
  // Open word details retain their separate modal lifecycle and accessibility check.
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})
