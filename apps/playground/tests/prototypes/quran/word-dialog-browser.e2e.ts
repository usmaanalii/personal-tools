import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockQuranContent } from './content-fixture'

// These checks cover browser focus management and rendered geometry that jsdom cannot prove.
function expectDialogWithinViewport(bounds: { x: number; y: number; width: number; height: number } | null, viewport: { width: number; height: number }) {
  if (!bounds) throw new Error('The word dialog must have a rendered bounding box.')
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.y).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height)
}

test('keeps keyboard focus in the word dialog and returns it to the last selected word', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./quran/')
  const firstWord = page.getByRole('button', { name: 'بِسْمِ · 1:1:1' })
  await firstWord.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Word meaning' })
  const close = dialog.getByRole('button', { name: 'Close word meaning' })
  const next = dialog.getByRole('button', { name: 'Next word' })
  await expect(dialog).toBeVisible()
  await expect(close).toBeFocused()
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(accessibility.violations).toEqual([])

  await page.keyboard.press('Tab')
  await expect(next).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await next.click()
  await expect(dialog.getByText('of Allah')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'اللَّهِ · 1:1:2' })).toBeFocused()
})

test('keeps long word details and their controls usable on narrow and landscape screens', async ({ page }) => {
  await mockQuranContent(page, { meaning: 'A long word explanation. '.repeat(120) })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./quran/')
  await page.getByRole('button', { name: 'بِسْمِ · 1:1:1' }).click()
  const dialog = page.getByRole('dialog', { name: 'Word meaning' })
  await expect(dialog).toBeVisible()
  const initialViewport = page.viewportSize()
  if (initialViewport) expectDialogWithinViewport(await dialog.boundingBox(), initialViewport)
  await page.setViewportSize({ width: 320, height: 568 })
  await expect(dialog).toBeVisible()
  const bounds = await dialog.boundingBox()
  expectDialogWithinViewport(bounds, { width: 320, height: 568 })
  await dialog.getByRole('button', { name: 'Next word' }).click()
  await expect(dialog.getByText('of Allah', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Previous word' }).click()
  await expect(dialog.getByText(/^A long word explanation\./)).toBeVisible()

  await page.setViewportSize({ width: 740, height: 360 })
  await expect(dialog).toBeVisible()
  const landscapeBounds = await dialog.boundingBox()
  expectDialogWithinViewport(landscapeBounds, { width: 740, height: 360 })

  await dialog.getByRole('button', { name: 'Close word meaning' }).click()
  await expect(dialog).toBeHidden()
})
