import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import type { QuranWord, VersesResponse } from '@scratch-pages/api-contracts/quran'
import App from '../../app/app'
import { server, quranEndpoint } from '../../test-server'
import { buildWord } from './quran-fixtures.test-data'

// jsdom models dialog visibility, not native focus containment or Escape dispatch.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: { configurable: true, value() { this.setAttribute('open', '') } },
  close: { configurable: true, value() { this.removeAttribute('open') } },
})

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
  expect(details.getByText('بِسْمِ')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByText("bis'mi")).toBeVisible()
  expect(details.getByText('Al-Fātiḥah · 1:1')).toBeVisible()
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
  expect(screen.getByRole('button', { name: 'ٱللَّهِ · 1:1:2' })).toHaveAttribute('aria-pressed', 'true')
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

it('returns to the selected word when word details are dismissed', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = screen.getByRole('dialog')
  // The visibility-only shim does not move focus into the dialog on opening.
  within(details).getByRole('button', { name: 'Close word meaning' }).focus()
  // Escape produces a native cancel event in browsers; jsdom does not dispatch it.
  fireEvent(details, new Event('cancel', { cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(word).toHaveFocus()
  expect(word).toHaveAttribute('aria-pressed', 'false')
})

it('focuses the new chapter heading when the selected word disappears', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  screen.getByRole('button', { name: 'Close word meaning' }).focus()
  // Inject external context invalidation without moving focus to a background
  // control. This proves reader wiring, not a user clicking through modal inertness.
  fireEvent.click(screen.getByRole('button', { name: /^NEXT/ }))
  await screen.findByText('2:1')
  expect(word).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Al-Baqarah' })).toHaveFocus())
})

it.each(['chapter', 'page'])('closes word details when another %s is opened', async change => {
  const { user, word } = await renderWords({ chapter: change === 'page' ? 2 : 1 })
  await user.click(word)
  // The visibility-only shim lets this model Reader's context/focus wiring.
  // Native modality prevents this background interaction in a real browser.
  const control = screen.getByRole('button', { name: change === 'chapter' ? /^NEXT/ : 'Next verses' })
  await user.click(control)
  await screen.findByText(change === 'chapter' ? '2:1' : 'Page 2')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(word).not.toBeInTheDocument()
  expect(control).toHaveFocus()
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
