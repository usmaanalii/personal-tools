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
  const titleId = await dialog.getAttribute('aria-labelledby')
  expect(titleId).toBeTruthy()
  await expect(dialog.locator(`#${titleId}`)).toHaveText('Word meaning')
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

test('keeps long word details scrollable at narrow, landscape and 200% reflow widths', async ({ page }) => {
  await mockQuranContent(page, { meaning: 'A long word explanation. '.repeat(120) })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./quran/')
  await page.getByRole('button', { name: 'بِسْمِ · 1:1:1' }).click()
  const dialog = page.getByRole('dialog', { name: 'Word meaning' })
  await expect(dialog).toBeVisible()
  const initialViewport = page.viewportSize()
  if (initialViewport) {
    const initialBounds = await dialog.boundingBox()
    expectDialogWithinViewport(initialBounds, initialViewport)
    if (initialViewport.width > 760 && initialBounds) {
      expect(Math.abs(initialBounds.x + initialBounds.width / 2 - initialViewport.width / 2)).toBeLessThan(1)
      expect(Math.abs(initialBounds.y + initialBounds.height / 2 - initialViewport.height / 2)).toBeLessThan(1)
    } else if (initialBounds) {
      expect(initialBounds.x).toBe(0)
      expect(initialBounds.y + initialBounds.height).toBe(initialViewport.height)
    }
  }
  await page.setViewportSize({ width: 320, height: 568 })
  await expect(dialog).toBeVisible()
  const bounds = await dialog.boundingBox()
  expectDialogWithinViewport(bounds, { width: 320, height: 568 })
  const fixedNavigationIsCovered = await page.evaluate(() => Boolean(document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 8)?.closest('[role="dialog"]')))
  expect(fixedNavigationIsCovered).toBe(true)
  await dialog.getByRole('button', { name: 'Next word' }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('button', { name: 'Next word' })).toBeVisible()

  await page.setViewportSize({ width: 740, height: 360 })
  await expect(dialog).toBeVisible()
  const landscapeBounds = await dialog.boundingBox()
  expectDialogWithinViewport(landscapeBounds, { width: 740, height: 360 })

  // A 640px CSS viewport matches the layout viewport at 200% zoom on a 1280px display.
  await page.setViewportSize({ width: 640, height: 720 })
  await expect(dialog).toBeVisible()
  const zoomedBounds = await dialog.boundingBox()
  expectDialogWithinViewport(zoomedBounds, { width: 640, height: 720 })
})
