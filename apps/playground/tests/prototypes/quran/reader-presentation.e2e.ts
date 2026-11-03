import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockQuranContent } from './content-fixture'

test('keeps selected chapter view text readable while hovered', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover contrast requires a mouse-capable browser.')
  // Browser risk: generated utility specificity can override the pressed colour on hover.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockQuranContent(page)
  await page.goto('quran/')
  const selected = page.getByRole('button', { name: 'All chapters', pressed: true })
  await selected.hover()
  const accessibility = await new AxeBuilder({ page })
    .include('[aria-label="Chapter browsing"]')
    .withRules(['color-contrast'])
    .analyze()
  expect(accessibility.violations).toEqual([])
})

// Presentation-only regression: jsdom cannot resolve responsive CSS or render typography.
// These computed-style assertions intentionally live outside the reader behavior tests.
test('preserves Quran typography and verse viewport sizing across screen sizes', async ({ page, isMobile }) => {
  test.skip(isMobile, 'This presentation check supplies its own desktop and phone viewport sizes.')
  await mockQuranContent(page)
  await page.goto('quran/')
  await expect(page.getByRole('article').first()).toBeVisible()
  const chapter = page.getByRole('complementary', { name: 'Current chapter' })
  for (const { width, height, maxHeight, fontSize } of [
    { width: 1440, height: 1080, maxHeight: '540px', fontSize: '27px' },
    { width: 1440, height: 900, maxHeight: '450px', fontSize: '27px' },
    { width: 390, height: 844, maxHeight: 'none', fontSize: '28px' },
  ]) {
    await page.setViewportSize({ width, height })
    await expect(chapter.locator('.verse-list')).toHaveCSS('max-height', maxHeight)
    await expect(chapter.locator('.arabic-text').first()).toHaveCSS('font-size', fontSize)
  }
})
