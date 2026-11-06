import { expect, test, type Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockQuranContent } from './content-fixture'

async function documentBox(locator: Locator) {
  return locator.evaluate(element => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height }
  })
}

// Geometry across real CSS, scroll containers and responsive breakpoints is not proved by jsdom.
// API fixtures control wait stages; this does not prove hosted backend connectivity.
test('keeps reading and search areas stable through loading, empty results and retries', async ({ page }, testInfo) => {
  await mockQuranContent(page)
  let releaseChapters = () => {}
  let failChapters = true
  const chaptersPending = new Promise<void>(resolve => { releaseChapters = resolve })
  await page.route('**/functions/v1/quran/v2/chapters', async route => {
    await chaptersPending
    if (failChapters) return route.fulfill({ status: 503, json: {} })
    await route.fallback()
  })
  let releaseVerses = () => {}
  const versesPending = new Promise<void>(resolve => { releaseVerses = resolve })
  await page.route('**/functions/v1/quran/v2/verses?*', async route => {
    await versesPending
    await route.fallback()
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./quran/')
  await expect(page.getByRole('status')).toHaveText('Loading chapters…')
  const skeleton = page.locator('[data-slot="skeleton"]').first()
  await expect.poll(() => skeleton.evaluate(element => element.getAnimations().length)).toBe(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect.poll(() => skeleton.evaluate(element => element.getAnimations().length)).toBeGreaterThan(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const panel = page.getByRole('complementary', { name: 'Current chapter' })
  const initial = await documentBox(panel)
  const browser = page.getByRole('region', { name: 'Chapter browsing' })
  const initialBrowsing = await documentBox(browser)
  const sources = page.getByRole('region', { name: 'Sources' })
  const initialSources = await documentBox(sources)
  const loadingAccessibility = await new AxeBuilder({ page }).analyze()
  expect(loadingAccessibility.violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('reader-loading.png'), fullPage: true })
  releaseChapters()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await documentBox(panel)).toEqual(initial)
  expect(await documentBox(browser)).toEqual(initialBrowsing)
  expect(await documentBox(sources)).toEqual(initialSources)
  failChapters = false
  await page.getByRole('button', { name: 'Retry chapters' }).click()
  await expect(page.getByRole('status')).toHaveText('Loading verses…')
  expect(await documentBox(panel)).toEqual(initial)
  const verses = page.getByRole('region', { name: 'Verses' })
  const reading = await documentBox(verses)
  releaseVerses()
  await expect(page.getByRole('button', { name: 'Bookmark verse 1' })).toBeVisible()
  expect(await documentBox(verses)).toEqual(reading)
  await page.screenshot({ path: testInfo.outputPath('reader-loaded.png'), fullPage: true })

  expect(await documentBox(browser)).toEqual(initialBrowsing)
  expect(await documentBox(sources)).toEqual(initialSources)
  const browsing = await documentBox(browser)
  await page.getByRole('button', { name: 'Search chapters', exact: true }).click()
  expect(await documentBox(browser)).toEqual(browsing)
  await page.getByRole('textbox', { name: 'Search chapters' }).fill('no matching chapter')
  await expect(page.getByRole('status')).toContainText('No chapters match')
  expect(await documentBox(browser)).toEqual(browsing)
  await page.getByRole('button', { name: 'Close search' }).click()
  await page.getByRole('button', { name: /My bookmarks/ }).click()
  expect(await documentBox(browser)).toEqual(browsing)

  // Errors and retries must preserve the reading footprint as well as successful responses.
  await page.route('**/functions/v1/quran/v2/verses?*', route => route.fulfill({ status: 503, json: {} }))
  await page.getByRole('button', { name: /^NEXT/ }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await documentBox(verses)).toEqual(reading)
  await page.route('**/functions/v1/quran/v2/verses?*', route => route.abort())
  await page.getByRole('button', { name: 'Retry verses' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await documentBox(verses)).toEqual(reading)
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])

  let releasePage = () => {}
  const pagePending = new Promise<void>(resolve => { releasePage = resolve })
  await page.route('**/functions/v1/quran/v2/verses?*', async route => {
    const secondPage = new URL(route.request().url()).searchParams.get('page') === '2'
    if (secondPage) await pagePending
    await route.fulfill({ json: { verses: [{ number: secondPage ? 21 : 1, arabic: 'نص للاختبار', translationHtml: 'Pagination fixture.' }], translationName: 'Fixture translator', nextPage: secondPage ? null : 2 } })
  })
  await page.getByRole('button', { name: 'Retry verses' }).click()
  await expect(page.getByRole('button', { name: 'Next verses' })).toBeEnabled()
  await page.getByRole('button', { name: 'Next verses' }).click()
  await expect(page.getByRole('status')).toHaveText('Loading verses…')
  expect(await documentBox(verses)).toEqual(reading)
  releasePage()
  await expect(page.getByRole('button', { name: 'Bookmark verse 21' })).toBeVisible()
  expect(await documentBox(verses)).toEqual(reading)
})
