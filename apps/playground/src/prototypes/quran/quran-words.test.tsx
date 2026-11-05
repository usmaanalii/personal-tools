import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import type { QuranWord, VersesResponse } from '@scratch-pages/api-contracts/quran'
import App from '../../app/app'
import { server, quranEndpoint } from '../../test-server'
import { buildWord } from './quran-fixtures.test-data'

function words() {
  return [buildWord(), buildWord({ position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah', transliteration: 'l-lahi' })]
}

async function renderWords({ verseWords = words(), chapter = 1 }: { verseWords?: QuranWord[]; chapter?: 1 | 2 } = {}) {
  const buildPage = (chapter: number, verse: number, nextPage: number | null): VersesResponse => ({
    verses: [{ number: verse, arabic: verseWords.map(word => word.arabic).join(' '), translationHtml: 'Verse translation',
      words: verseWords.map(word => ({ ...word, chapter, verse })),
    }], translationName: 'Verse translator', nextPage,
  })
  const pages = new Map<string, VersesResponse>([
    ['1:1', buildPage(1, 1, null)],
    ['2:1', buildPage(2, 1, 2)],
    ['2:2', buildPage(2, 21, null)],
  ])
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const params = new URL(request.url).searchParams
    const page = pages.get(`${params.get('chapter')}:${params.get('page')}`)
    return page ? HttpResponse.json(page) : HttpResponse.json({ error: 'No fixture for this chapter and page' }, { status: 404 })
  }))
  window.history.pushState({}, '', '/quran/')
  render(<App />)
  const user = userEvent.setup()
  await screen.findByRole('button', { name: 'بِسْمِ · 1:1:1' })
  if (chapter === 2) await user.click(screen.getByRole('button', { name: /^Open Al-Baqarah/ }))
  const word = await screen.findByRole('button', { name: `بِسْمِ · ${chapter}:1:1` })
  return { user, word }
}
afterEach(() => window.history.pushState({}, '', '/'))

it("shows a word's details when it is selected", async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog', { name: 'Word meaning' }))
  const arabic = details.getByText('بِسْمِ')
  expect(arabic).toBeVisible()
  expect(arabic).toHaveAttribute('lang', 'ar')
  expect(arabic).toHaveAttribute('dir', 'rtl')
  expect(arabic).toHaveAttribute('translate', 'no')
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByText("bis'mi")).toBeVisible()
  expect(details.getByText('Al-Fātiḥah · 1:1')).toBeVisible()
  expect(details.getByText('English word data · Quran Foundation')).toBeVisible()
  expect(word).toHaveAttribute('aria-pressed', 'true')
})

it('shows adjacent words in the same verse when Previous or Next is selected', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(details.getByRole('button', { name: 'Previous word' })).toBeDisabled()
  await user.click(details.getByRole('button', { name: 'Next word' }))
  expect(details.getByText('of Allah')).toBeVisible()
  expect(word).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: 'ٱللَّهِ · 1:1:2', hidden: true })).toHaveAttribute('aria-pressed', 'true')
  expect(details.queryByText('In (the) name')).not.toBeInTheDocument()
  expect(details.getByRole('button', { name: 'Next word' })).toBeDisabled()
  await user.click(details.getByRole('button', { name: 'Previous word' }))
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(word).toHaveAttribute('aria-pressed', 'true')
})

it('returns to the last selected word when word details are closed', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Next word' }))
  await user.click(details.getByRole('button', { name: 'Close word meaning' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const lastWord = screen.getByRole('button', { name: 'ٱللَّهِ · 1:1:2' })
  expect(lastWord).toHaveFocus()
  expect(lastWord).toHaveAttribute('aria-pressed', 'false')
  expect(word).toHaveAttribute('aria-pressed', 'false')
})

it('returns to the selected word when Escape dismisses its details', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(word).toHaveFocus()
  expect(word).toHaveAttribute('aria-pressed', 'false')
})

it.each(['chapter', 'page'])('shows word details from another %s after closing the previous details', async change => {
  const { user, word } = await renderWords({ chapter: change === 'page' ? 2 : 1 })
  await user.click(word)
  await user.click(screen.getByRole('button', { name: 'Close word meaning' }))
  await user.click(screen.getByRole('button', { name: change === 'chapter' ? /^NEXT/ : 'Next verses' }))
  const nextWord = await screen.findByRole('button', { name: `بِسْمِ · 2:${change === 'chapter' ? 1 : 21}:1` })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(nextWord).toHaveAttribute('aria-pressed', 'false')
  await user.click(nextWord)
  expect(within(screen.getByRole('dialog', { name: 'Word meaning' }))
    .getByText(`Al-Baqarah · 2:${change === 'chapter' ? 1 : 21}`)).toBeVisible()
})

it('disables Previous and Next when a verse contains one word', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord()] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(details.getByText('Word 1 of 1')).toBeVisible()
  expect(details.getByRole('button', { name: 'Previous word' })).toBeDisabled()
  expect(details.getByRole('button', { name: 'Next word' })).toBeDisabled()
})

it("shows when a word's meaning or pronunciation is unavailable", async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ meaning: null, transliteration: null })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(details.getByText('Meaning unavailable for this word.')).toBeVisible()
  expect(details.getByText('Transliteration unavailable')).toBeVisible()
})
