import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockQuranContent } from './content-fixture'

test('keeps navigation readable immediately after changing destinations', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('quran/')
  await page.addStyleTag({ content: ':root { --theme-motion-fast: 10s; }' })
  await page.getByRole('button', { name: 'Chapters' }).click()
  await page.getByRole('navigation', { name: 'Reader controls' }).evaluate(element => {
    element.getAnimations({ subtree: true }).forEach(animation => {
      animation.pause()
      animation.currentTime = 5000
    })
  })
  const accessibility = await new AxeBuilder({ page }).include('[aria-label="Reader controls"]').withRules(['color-contrast']).analyze()
  expect(accessibility.violations).toEqual([])
})

test('keeps selected chapter view text readable while hovered', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover contrast requires a mouse-capable browser.')
  // Browser risk: generated utility specificity can override the pressed colour on hover.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockQuranContent(page)
  await page.goto('quran/')
  const selected = page.getByRole('button', { name: 'Read', pressed: true })
  await selected.hover()
  const accessibility = await new AxeBuilder({ page })
    .include('[aria-label="Reader controls"]')
    .withRules(['color-contrast'])
    .analyze()
  expect(accessibility.violations).toEqual([])
})
