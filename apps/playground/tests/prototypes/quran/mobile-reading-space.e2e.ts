import { expect, test } from '@playwright/test'
import { mockQuranContent } from './content-fixture'
import { importCorpus } from '../../../scripts/quran-data/corpus'
import { WordGrammarSchema } from '@scratch-pages/api-contracts/quran'

// Browser scrolling and control visibility cannot be established in jsdom.
// Device emulation does not prove behaviour with a physical software keyboard.
// Both project runs are intentional: narrow desktop keyboard and mobile touch contexts.
test.use({ viewport: { width: 320, height: 568 } })

test('returns to a saved verse through the top bookmarks control', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./quran/')
  await page.getByRole('button', { name: 'Bookmark verse 1' }).click()
  const navigation = page.getByRole('navigation', { name: 'Reader controls' })
  await navigation.getByRole('button', { name: /bookmarks/i }).click()
  await expect(page.getByRole('button', { name: 'Al-Fātiḥah 1:1' })).toBeInViewport()
  await page.getByRole('button', { name: 'Al-Fātiḥah 1:1' }).click()
  await expect(page.getByRole('heading', { name: 'Al-Fātiḥah', exact: true })).toBeInViewport()
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
