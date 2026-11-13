import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { WordSchema } from '@scratch-pages/api-contracts/quran'
import { importCorpus } from '../../../scripts/quran-data/corpus'
import { enrichGrammar } from '../../../../../supabase/functions/quran/morphology'
import { mockQuranContent } from './content-fixture'

// Pinned verse/reference fixture; both dictionaries use the actual local Deno
// entry point and generated source assets. This proves browser continuation
// and backend wiring, not hosted bundling or live Quran Foundation access.
test('reads expanded Lane pages and original Mufradāt for an Al-Baqarah word', async ({ page }, testInfo) => {
  const reference = z.object({ words: z.array(WordSchema) }).parse(JSON.parse(readFileSync('data/quran/foundation-chapters-1-2.json', 'utf8')))
  const verseWords = reference.words.filter(item => item.chapter === 2 && item.verse === 2)
  const word = verseWords.find(item => item.position === 2)
  if (!word) throw new Error('Missing pinned book occurrence')
  const chapter = importCorpus('(2:2:2:1)\t{lo\tDET\tPREFIX|Al+\n(2:2:2:2)\tkita`bu\tN\tSTEM|POS:N|LEM:kita`b|ROOT:ktb|M|NOM').chapters['2']
  const verses = await enrichGrammar({ verses: [{ number: 2, arabic: verseWords.map(item => item.arabic).join(' '), translationHtml: 'Reference fixture', words: verseWords }], translationName: 'Pinned reference fixture', nextPage: null }, 2, new AbortController().signal, async () => chapter)
  expect(verses.verses[0]?.words?.[1]?.grammar?.status).toBe('available')
  await mockQuranContent(page)
  await page.route('**/functions/v1/quran/v2/verses?*', route => new URL(route.request().url()).searchParams.get('chapter') === '2' ? route.fulfill({ json: verses }) : route.fallback())
  const requests: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/dictionary/entries')) requests.push(request.url())
  })
  await page.goto('./quran/')
  await page.getByRole('button', { name: /^2\s*Al-Baqarah/ }).click()
  await page.getByRole('button', { name: `${word.arabic} · 2:2:2` }).click()
  const dialog = page.getByRole('dialog', { name: 'Word meaning' })
  await dialog.getByRole('tab', { name: 'Dictionary' }).click()
  await expect(dialog.getByRole('article')).toHaveCount(22)
  expect(requests).toHaveLength(2)
  expect(new URL(requests[1] ?? '').searchParams.has('cursor')).toBe(true)
  // Checks provenance survives browser continuation and the second backend page.
  const lastEntry = dialog.getByRole('article').last()
  await expect(lastEntry.getByText(/Related to root/)).toHaveText('Related to root · كتب')
  await lastEntry.getByRole('heading').scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('group', { name: 'Word summary' })).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('lane-root-provenance.png') })
  await dialog.getByRole('tab', { name: 'Mufradāt' }).click()
  const article = dialog.getByRole('article', { name: 'كتب' })
  await expect(article).toBeVisible()
  await article.getByRole('button', { name: 'Read full Arabic entry' }).click()
  await expect(dialog.getByRole('link', { name: 'OpenITI original · jk-l13005' })).toHaveAttribute('href', /#L13005-L13094$/)
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('expanded-dictionaries.png') })
})
