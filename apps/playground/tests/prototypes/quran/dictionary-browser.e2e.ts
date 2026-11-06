import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockQuranContent } from './content-fixture'

// Verse content is a fixture; Dictionary uses the actual local Deno entry point
// and pinned backend assets. This does not prove the hosted Supabase gateway.
test('keeps word context visible while scrolling a real Lane dictionary entry', async ({ page }, testInfo) => {
  await mockQuranContent(page)
  await page.goto('./quran/')
  await page.getByRole('button', { name: 'بِسْمِ · 1:1:1' }).click()
  const dialog = page.getByRole('dialog', { name: 'Word meaning' })
  await dialog.getByRole('tab', { name: 'Dictionary' }).click()
  const dictionary = dialog.getByRole('region', { name: 'Lane’s dictionary' })
  const article = dictionary.getByRole('article').first()
  await expect(article).toBeVisible()
  await article.getByRole('button', { name: 'Read full entry' }).click()
  await expect(article.getByText('name', { exact: true }).first()).toBeVisible()
  const panel = dialog.getByRole('tabpanel', { name: 'Dictionary' })
  await panel.focus()
  await expect(panel).toBeFocused()
  await page.keyboard.press('End')
  await expect(dialog.getByText('Al-Fātiḥah · Verse 1')).toBeInViewport()
  await expect(dialog.getByRole('group', { name: 'Word summary' }).getByText('بِسْمِ', { exact: true })).toBeInViewport()
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(accessibility.violations).toEqual([])
  await page.setViewportSize({ width: 320, height: 568 })
  await panel.focus()
  await panel.press('ControlOrMeta+End')
  await expect(dialog.getByRole('group', { name: 'Word summary' })).toBeInViewport()
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await panel.press('ControlOrMeta+Home')
  // Home returns to the context/introduction. Bring the named entry into view for the review capture.
  const entryHeading = article.getByRole('heading')
  await entryHeading.scrollIntoViewIfNeeded()
  await expect(entryHeading).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('lane-dictionary.png') })
  await page.setViewportSize({ width: 740, height: 360 })
  await panel.focus()
  await panel.press('ControlOrMeta+End')
  await expect(dialog.getByRole('group', { name: 'Word summary' })).toBeInViewport()
  await dialog.getByRole('button', { name: 'Close word meaning' }).click()
  await expect(page.getByRole('button', { name: 'بِسْمِ · 1:1:1' })).toBeFocused()
})
