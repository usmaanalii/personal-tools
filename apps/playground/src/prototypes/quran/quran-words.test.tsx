import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import App from '../../app/app'
import { server, quranEndpoint } from '../../test-server'

// jsdom has no modal implementation. Model visibility only; browser tests own
// native focus containment, Escape dispatch and layout verification.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: { configurable: true, value() { this.setAttribute('open', '') } },
  close: { configurable: true, value() { this.removeAttribute('open') } },
})

function words() {
  return [
    { chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ', meaning: 'In (the) name', transliteration: "bis'mi" },
    { chapter: 1, verse: 1, position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah', transliteration: 'l-lahi' },
  ]
}
async function renderWords() {
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => HttpResponse.json({
    verses: [{ number: 1, arabic: 'بِسْمِ ٱللَّهِ', translationHtml: 'In the name of Allah', words: words().map(word => ({ ...word, chapter: Number(new URL(request.url).searchParams.get('chapter')) })) }],
    translationName: 'Verse translator', nextPage: 2,
  })))
  window.history.pushState({}, '', '/quran/')
  render(<App />)
  const word = await screen.findByRole('button', { name: 'بِسْمِ · 1:1:1' })
  return { user: userEvent.setup(), word }
}
afterEach(() => window.history.pushState({}, '', '/'))

it('opens the selected occurrence with its meaning, transliteration and verse reference', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const dialog = screen.getByRole('dialog', { name: 'Word meaning' })
  expect(within(dialog).getByText('In (the) name')).toBeInTheDocument()
  expect(within(dialog).getByText("bis'mi")).toBeInTheDocument()
  expect(within(dialog).getByText('Al-Fātiḥah · 1:1')).toBeInTheDocument()
  expect(word).toHaveAttribute('aria-pressed', 'true')
})

it('moves only within the verse and restores focus to the last selected occurrence', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByRole('button', { name: 'Previous word' })).toBeDisabled()
  await user.click(dialog.getByRole('button', { name: 'Next word' }))
  expect(dialog.getByText('of Allah')).toBeInTheDocument()
  expect(dialog.queryByText('In (the) name')).not.toBeInTheDocument()
  expect(dialog.getByRole('button', { name: 'Next word' })).toBeDisabled()
  await user.click(dialog.getByRole('button', { name: 'Previous word' }))
  await user.click(dialog.getByRole('button', { name: 'Next word' }))
  await user.click(dialog.getByRole('button', { name: 'Close word meaning' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'ٱللَّهِ · 1:1:2' })).toHaveFocus()
  expect(word).toHaveAttribute('aria-pressed', 'false')
})

it.each(['chapter', 'page'])('closes word details when the reading %s changes', async change => {
  const { user, word } = await renderWords()
  await user.click(word)
  // jsdom models the selection change; real modal background inertness is
  // checked in Playwright. A reading-context change must unmount the surface.
  await user.click(screen.getByRole('button', { name: change === 'chapter' ? /^NEXT/ : 'Next verses' }))
  await screen.findByText(change === 'chapter' ? '2:1' : 'Page 2')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('shows explicit unavailable labels when word annotations are missing', async () => {
  await renderWords()
  server.use(http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({
    verses: [{ number: 21, arabic: 'بِسْمِ', translationHtml: 'Verse text', words: [{ ...words()[0], verse: 21, meaning: null, transliteration: null }] }], translationName: 'Translator', nextPage: null,
  })))
  await userEvent.click(screen.getByRole('button', { name: 'Next verses' }))
  await userEvent.click(await screen.findByRole('button', { name: 'بِسْمِ · 1:21:1' }))
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByText('Meaning unavailable for this word.')).toBeInTheDocument()
  expect(dialog.getByText('Transliteration unavailable')).toBeInTheDocument()
})
