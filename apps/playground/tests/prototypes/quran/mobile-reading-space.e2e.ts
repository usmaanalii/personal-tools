import { expect, test } from '@playwright/test'
import { mockQuranContent } from './content-fixture'
import { importCorpus } from '../../../scripts/quran-data/corpus'
import { WordGrammarSchema } from '@scratch-pages/api-contracts/quran'

// Browser scrolling and control visibility cannot be established in jsdom.
// Device emulation does not prove behaviour with a physical software keyboard.
// Both project runs are intentional: narrow desktop keyboard and mobile touch contexts.
test.use({ viewport: { width: 320, height: 568 } })

test('keeps the chapter heading clear of navigation at a narrow effective viewport', async ({ page }) => {
  await page.setViewportSize({ width: 160, height: 284 })
  await mockQuranContent(page)
  await page.goto('./quran/')
  await page.getByRole('button', { name: 'Chapters' }).click()
  const navigation = await page.getByRole('navigation', { name: 'Reader controls' }).boundingBox()
  const heading = await page.getByRole('heading', { name: /^Chapters/ }).boundingBox()
  if (!navigation || !heading) throw new Error('Expected navigation and chapter heading')
  expect(navigation.y + navigation.height).toBeLessThanOrEqual(heading.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(160)
})

test('keeps navigation above chapter search when the visible viewport becomes shorter', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./quran/')
  const navigation = page.getByRole('navigation', { name: 'Reader controls' })
  await navigation.getByRole('button', { name: 'Chapters' }).click()
  await page.getByRole('button', { name: 'Search chapters' }).click()
  const search = page.getByRole('textbox', { name: 'Search chapters' })
  await expect(search).toBeFocused()
  await page.setViewportSize({ width: 320, height: 350 })
  const navBox = await navigation.boundingBox()
  const searchBox = await search.boundingBox()
  if (!navBox || !searchBox) throw new Error('Navigation and search must be visible')
  expect(navBox.y + navBox.height).toBeLessThanOrEqual(searchBox.y)
  await expect(search).toBeInViewport({ ratio: 1 })
})

test('shows scripture on entry and scrolls the document to the last verse', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./quran/')
  await expect(page.getByRole('button', { name: / · 1:1:1$/ })).toBeInViewport({ ratio: 1 })
  const lastVerse = page.getByRole('article').last()
  await lastVerse.scrollIntoViewIfNeeded()
  await expect(lastVerse).toBeInViewport()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  expect(await page.getByRole('region', { name: 'Verses' }).evaluate(region => region.scrollTop)).toBe(0)
})

test('returns to the same document position after visiting another destination', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./quran/')
  const laterVerse = page.getByRole('article').nth(4)
  await laterVerse.scrollIntoViewIfNeeded()
  const position = await page.evaluate(() => window.scrollY)
  expect(position).toBeGreaterThan(0)

  const navigation = page.getByRole('navigation', { name: 'Reader controls' })
  await navigation.getByRole('button', { name: 'Chapters' }).click()
  await expect(page.getByRole('heading', { name: /^Chapters/ })).toBeFocused()
  await navigation.getByRole('button', { name: 'Read' }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(position)
  const restoredVerse = page.locator('article:focus')
  await expect(restoredVerse).toHaveCount(1)
  const bookmarkName = await restoredVerse.getByRole('button', { name: /Bookmark verse/ }).getAttribute('aria-label')
  if (!bookmarkName) throw new Error('Expected a verse bookmark')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: bookmarkName })).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.setViewportSize({ width: 1440, height: 600 })
  await page.getByRole('article').last().scrollIntoViewIfNeeded()
  const desktopPosition = await page.evaluate(() => window.scrollY)
  expect(desktopPosition).toBeGreaterThan(0)
  await navigation.getByRole('button', { name: 'Bookmarks' }).click()
  await navigation.getByRole('button', { name: 'Read' }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(desktopPosition)
})

test('returns to a saved verse through the bookmarks control', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./quran/')
  const verse = page.getByRole('button', { name: 'Bookmark verse 5' })
  await verse.click()
  const navigation = page.getByRole('navigation', { name: 'Reader controls' })
  await navigation.getByRole('button', { name: /bookmarks/i }).click()
  const saved = page.getByRole('button', { name: 'Al-Fātiḥah 1:5' })
  await expect(saved).toBeInViewport()
  await saved.click()
  await expect(verse).toBeFocused()
  await expect(verse).toBeInViewport({ ratio: 1 })
})

test('shows the beginning of the next word after reading to the end of an analysis', async ({ page }) => {
  const response = await mockQuranContent(page)
  const morphology = importCorpus('(1:1:3:1)\t{l\tDET\tPREFIX|Al+\n(1:1:3:2)\tr~aHoma`ni\tADJ\tSTEM|POS:ADJ|LEM:r~aHoma`n|ROOT:rHm|MS|GEN\n(1:1:4:1)\t{l\tDET\tPREFIX|Al+\n(1:1:4:2)\tr~aHiymi\tADJ\tSTEM|POS:ADJ|LEM:raHiym|ROOT:rHm|MS|GEN').chapters['1']
  await page.route('**/functions/v1/quran/v2/verses?*', route => route.fulfill({ json: {
    ...response,
    verses: response.verses.map(verse => ({ ...verse, words: verse.words?.map(word => {
      const record = morphology?.words[`${word.chapter}:${word.verse}:${word.position}`]
      if (!record) return word
      return { ...word, arabic: record.arabic, grammar: WordGrammarSchema.parse({ status: 'available', segments: record.segments }) }
    }) })),
  } }))
  await page.goto('./quran/')
  await page.getByRole('button', { name: / · 1:1:3$/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Word meaning' })
  const panel = dialog.getByRole('tabpanel', { name: 'Grammar' })
  await expect(panel.getByText('Stem · Adjective', { exact: true })).toBeVisible()
  await panel.focus()
  await panel.press('End')
  await expect(dialog.getByRole('note', { name: 'Word sources' })).toBeInViewport()
  await expect(panel.getByText('the Most Gracious', { exact: true })).not.toBeInViewport()
  await dialog.getByRole('button', { name: 'Next word' }).click()
  await expect(panel.getByText('the Most Merciful', { exact: true })).toBeInViewport()
})
