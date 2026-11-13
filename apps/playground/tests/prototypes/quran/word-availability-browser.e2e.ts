import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { buildWord } from '../../../src/prototypes/quran/quran-fixtures.test-data'
import { availabilitySnapshots } from '../../../src/prototypes/quran/word-availability-snapshots'
import { mockQuranContent } from './content-fixture'

test('keeps dense verse controls within the built reader after direct load and refresh', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 568 })
  const dense = availabilitySnapshots.find(snapshot => snapshot.reference === '2:20')
  if (!dense) throw new Error('Expected the approved dense verse fixture')
  const words = dense.words.map(([arabic, corpus, lane, mufradat], index) => buildWord({
    chapter: 2, verse: 20, position: index + 1, arabic, availability: { corpus, lane, mufradat },
  }))
  await mockQuranContent(page)
  await page.route('**/functions/v1/quran/v2/verses?*', route => {
    if (new URL(route.request().url()).searchParams.get('chapter') !== '2') return route.fallback()
    return route.fulfill({ json: {
      verses: [{ number: 20, arabic: words.map(word => word.arabic).join(' '), words, translationHtml: 'Dense verse fixture.' }],
      nextPage: null, translationName: 'Fixture translator',
    } })
  })

  await page.goto('./quran/')
  const reading = page.getByRole('region', { name: 'Current chapter' })
  await expect(reading.getByRole('heading', { name: 'Al-Fātiḥah' })).toBeVisible()
  await page.reload()
  await expect(reading.getByRole('button', { name: / · 1:1:1$/ })).toBeVisible()
  await page.getByRole('button', { name: 'Chapters' }).click()
  await page.getByRole('button', { name: /^2\s*Al-Baqarah/ }).click()

  const verseRegion = reading.getByRole('region', { name: 'Verses' })
  const wordButtons = verseRegion.getByRole('button', { name: / · 2:20:\d+$/ })
  await expect(wordButtons).toHaveCount(25)
  await page.evaluate(() => document.fonts.ready)
  const bounds = await wordButtons.evaluateAll(buttons => buttons.map(button => {
    const { width, height, top, left } = button.getBoundingClientRect()
    return { width, height, top, left }
  }))
  expect(new Set(bounds.map(word => word.top)).size).toBeGreaterThan(1)
  expect(bounds.every(word => word.width >= 44 && word.height >= 44)).toBe(true)
  expect(bounds[0]?.left).toBeGreaterThan(bounds[1]?.left ?? Infinity)
  expect(await verseRegion.evaluate(region => region.scrollWidth <= region.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

  const pauseWord = wordButtons.nth(3)
  const arabicWithPause = 'أَبْصَـٰرَهُمْ ۖ'
  await expect(pauseWord).toHaveAccessibleName(`${arabicWithPause} · 2:20:4`)
  const circles = pauseWord.getByText('○○○', { exact: true })
  await expect(circles).toBeVisible()
  const arabicBottom = await pauseWord.evaluate((button, arabic) => {
    const text = document.createTreeWalker(button, NodeFilter.SHOW_TEXT)
    for (let node = text.nextNode(); node; node = text.nextNode()) {
      if (node.textContent?.trim() !== arabic) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      return range.getBoundingClientRect().bottom
    }
    throw new Error('Expected visible Arabic text including the pause mark')
  }, arabicWithPause)
  const circleBounds = await circles.boundingBox()
  if (!circleBounds) throw new Error('Expected rendered source circles')
  expect(circleBounds.y).toBeGreaterThanOrEqual(arabicBottom)
  await expect(verseRegion.getByText('۝20', { exact: true })).toBeVisible()
  await pauseWord.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Word meaning' })
  await expect(dialog.getByRole('button', { name: 'Close word meaning' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Next word' }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(wordButtons.nth(4)).toBeFocused()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
