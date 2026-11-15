import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('loads the comparison directly and after refresh', async ({ page }) => {
  await page.goto('./quran-word-availability/')
  const heading = page.getByRole('heading', { name: 'Quran word availability' })
  await expect(heading).toBeVisible()
  await page.reload()
  await expect(heading).toBeVisible()
})

test('fits a dense Arabic verse with usable word targets and keyboard selection on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./quran-word-availability/')
  const verse = page.getByRole('region', { name: 'Al-Baqarah 2:20' })
  const words = verse.getByRole('button')
  const firstWord = verse.getByRole('button', { name: / · 2:20:1$/ })
  await expect(words).toHaveCount(25)
  await page.evaluate(() => document.fonts.ready)
  const bounds = await words.evaluateAll(buttons => buttons.map(button => {
    const { y, width, height } = button.getBoundingClientRect()
    return { y, width, height }
  }))
  expect(new Set(bounds.map(word => word.y)).size).toBeGreaterThan(1)
  expect(bounds.every(word => word.width >= 44 && word.height >= 44)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await firstWord.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('Corpus: Available. Lane: Available. Mufradāt: Unavailable.')
  await expect(firstWord).toBeFocused()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
