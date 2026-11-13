import { expect, test, type Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockQuranContent } from './content-fixture'

function documentTop(locator: Locator) {
  return locator.evaluate(element => element.getBoundingClientRect().top + window.scrollY)
}

// These browser checks use fixtures to control request timing and exercise generated styles.
test('stops loading animation when reduced motion is requested', async ({ page }) => {
  await mockQuranContent(page)
  const pending = Promise.withResolvers<void>()
  await page.route('**/functions/v1/quran/v2/chapters', async route => {
    await pending.promise
    await route.fallback()
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('./quran/')
  await expect(page.getByRole('status')).toHaveText('Loading chapters…')
  const reading = page.getByRole('region', { name: 'Current chapter' })

  await expect.poll(() => reading.evaluate(element => element.getAnimations({ subtree: true }).length)).toBeGreaterThan(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => reading.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
  pending.resolve()
})

test('keeps the verse region at the same document position when scripture loads', async ({ page }) => {
  await mockQuranContent(page)
  const pending = Promise.withResolvers<void>()
  await page.route('**/functions/v1/quran/v2/verses?*', async route => {
    await pending.promise
    await route.fallback()
  })
  await page.goto('./quran/')
  await expect(page.getByRole('status')).toHaveText('Loading verses…')
  const verses = page.getByRole('region', { name: 'Verses' })
  const top = await documentTop(verses)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  pending.resolve()
  await expect(verses.getByRole('article').first()).toBeVisible()
  expect(await documentTop(verses)).toBe(top)
})
