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
