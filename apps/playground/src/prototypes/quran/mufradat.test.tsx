import { render, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server, quranEndpoint } from '../../test-server'
import { buildWord } from './quran-fixtures.test-data'
import { WordMufradat } from './word-mufradat'
import { buildMufradatEntry } from './mufradat-fixtures.test-data'
import userEvent from '@testing-library/user-event'

const endpoint = `${quranEndpoint}/mufradat`
function word() {
  return buildWord({ position: 4, arabic: 'ٱلرَّحِيمِ', meaning: 'the Most Merciful', transliteration: 'r-raḥīmi', grammar: { status: 'available', segments: [{ kind: 'stem', arabic: 'رحيم', partOfSpeech: 'ADJ', root: 'رحم', lemma: 'رَحِيم', features: [] }] } })
}
function serve() {
  server.use(http.get(endpoint, ({ request }) => {
    const query = new URL(request.url).searchParams
    if (query.get('root') !== 'رحم' || query.get('lemma') !== 'رَحِيم' || request.headers.get('apikey') !== 'sb_publishable_test_only') return new HttpResponse(null, { status: 400 })
    return HttpResponse.json({ status: 'matched', entry: buildMufradatEntry() })
  }))
}

it('shows the Arabic entry and its source', async () => {
  serve()
  render(<WordMufradat word={word()} />)
  const article = within(await screen.findByRole('article', { name: 'رحم' }))
  expect(article.getByText(/^رحم : الرحم رحم المرأة/)).toHaveAttribute('dir', 'rtl')
  expect(article.getByRole('heading', { name: 'رحم' })).toHaveAttribute('lang', 'ar')
  const source = screen.getByRole('link', { name: /OpenITI original · jk-l5840/ })
  expect(source).toHaveAttribute('href', expect.stringContaining('6290621b58e063ed1aa47ffd0a6fc1630191e7cb'))
  expect(screen.getByText('PageV01P190 · PageV01P191')).toBeVisible()
  expect(screen.getByRole('link', { name: 'CC BY-NC-SA 4.0' })).toBeVisible()
})

it('shows an ambiguous match when a word has different stem entries', async () => {
  server.use(http.get(endpoint, ({ request }) => {
    const root = new URL(request.url).searchParams.get('root')
    if (root === 'حمد') return HttpResponse.json({ status: 'matched', entry: buildMufradatEntry('jk-l3990') })
    if (root === 'رحم') return HttpResponse.json({ status: 'matched', entry: buildMufradatEntry() })
    return new HttpResponse(null, { status: 400 })
  }))
  const selected = word()
  if (selected.grammar?.status !== 'available') throw new Error('Expected available grammar fixture')
  render(<WordMufradat word={buildWord({ grammar: { status: 'available', segments: [...selected.grammar.segments, { kind: 'stem', arabic: 'حمد', partOfSpeech: 'N', root: 'حمد', lemma: 'حَمْد', features: [] }] } })} />)
  expect(await screen.findByText('More than one Mufradāt entry may match. No entry has been selected.')).toBeVisible()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

it('hides the previous entry when another word is selected', async () => {
  serve()
  const user = userEvent.setup()
  const view = render(<WordMufradat word={word()} />)
  await screen.findByRole('article', { name: 'رحم' })
  await user.click(screen.getByRole('button', { name: 'Read full Arabic entry' }))
  view.rerender(<WordMufradat word={buildWord({ position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah', transliteration: 'l-lāhi', grammar: { status: 'unavailable' } })} />)
  expect(screen.queryByRole('article', { name: 'رحم' })).not.toBeInTheDocument()
  await screen.findByText('No verified Mufradāt entry is available for this word.')
  view.rerender(<WordMufradat word={word()} />)
  await screen.findByRole('article', { name: 'رحم' })
  expect(screen.queryByText(buildMufradatEntry().paragraphs.join(' '))).not.toBeInTheDocument()
})

it('announces a failed load and moves focus to the reference after retry', async () => {
  server.use(http.get(endpoint, () => new HttpResponse(null, { status: 503 })))
  const user = userEvent.setup()
  render(<WordMufradat word={word()} />)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Mufradāt temporarily unavailable.'))
  serve()
  const retry = screen.getByRole('button', { name: 'Retry Mufradāt' })
  await user.click(retry)
  expect(await screen.findByRole('article', { name: 'رحم' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Mufradāt dictionary' })).toHaveFocus()
  expect(screen.queryByText('Mufradāt temporarily unavailable.')).not.toBeInTheDocument()
})

it('announces an ambiguous match without displaying an arbitrary Arabic entry', async () => {
  server.use(http.get(endpoint, () => HttpResponse.json({ status: 'ambiguous', ids: ['jk-l5840', 'jk-l3990'] })))
  render(<WordMufradat word={word()} />)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('More than one Mufradāt entry may match. No entry has been selected.'))
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

it('shows no verified entry without making a request when grammar is unavailable', async () => {
  const requests: string[] = []
  server.use(http.get(endpoint, ({ request }) => { requests.push(request.url); return HttpResponse.json({ status: 'missing' }) }))
  render(<WordMufradat word={buildWord({ grammar: { status: 'unavailable' } })} />)
  expect(await screen.findByText('No verified Mufradāt entry is available for this word.')).toBeVisible()
  expect(requests).toEqual([])
})

it('shows that no verified entry is available', async () => {
  server.use(http.get(endpoint, () => HttpResponse.json({ status: 'missing' })))
  render(<WordMufradat word={word()} />)
  expect(await screen.findByText('No verified Mufradāt entry is available for this word.')).toBeVisible()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

it('expands and collapses the Arabic excerpt without moving keyboard focus', async () => {
  serve()
  const fullParagraph = buildMufradatEntry().paragraphs.join(' ')
  const user = userEvent.setup()
  render(<WordMufradat word={word()} />)
  await screen.findByRole('article', { name: 'رحم' })
  expect(screen.queryByText(fullParagraph)).not.toBeInTheDocument()
  expect(screen.getByText(/^رحم : الرحم رحم المرأة/)).toBeVisible()
  const expand = screen.getByRole('button', { name: 'Read full Arabic entry' })
  await user.click(expand)
  expect(screen.getByText(fullParagraph)).toBeVisible()
  expect(expand).toHaveFocus()
  expect(expand).toHaveAttribute('aria-expanded', 'true')
  await user.click(screen.getByRole('button', { name: 'Show shorter Arabic entry' }))
  expect(screen.queryByText(fullParagraph)).not.toBeInTheDocument()
  expect(expand).toHaveFocus()
})
