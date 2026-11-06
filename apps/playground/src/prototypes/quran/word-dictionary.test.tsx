/// <reference lib="es2024.promise" />
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server, quranEndpoint } from '../../test-server'
import { buildWord } from './quran-fixtures.test-data'
import { importCorpus } from '../../../scripts/quran-data/corpus'
import { WordGrammarSchema, LaneEntrySchema } from '@scratch-pages/api-contracts/quran'
import { WordDictionary } from './word-dictionary'

const endpoint = `${quranEndpoint}/dictionary`
function word() {
  const segments = importCorpus('(1:1:1:1)\tbi\tP\tPREFIX|bi+\n(1:1:1:2)\tsomi\tN\tSTEM|POS:N|LEM:{som|ROOT:smw|M|GEN').chapters['1']?.words['1:1:1']?.segments
  return buildWord({ grammar: WordGrammarSchema.parse({ status: 'available', segments }) })
}
function entry(id = 'n20831') {
  return LaneEntrySchema.parse({ id, headword: id === 'n20831' ? 'اِسْمٌ' : 'اسم آخر', root: 'سمو', file: 'us0.xml', sourceUrl: 'https://github.com/alpheios-project/lan/blob/7dd04e1182c13a4b0883978867d2a3b04616542a/db/lexica/ara/lan/us0.xml', blocks: [
    { kind: 'form', label: '', runs: [{ text: 'اِسْمٌ', lang: 'ar', emphasis: false }] },
    { kind: 'text', label: '', runs: [{ text: 'The name of a thing. (S, M, Msb, K.)', lang: null, emphasis: true }] },
    { kind: 'sense', label: '2', runs: [] },
    { kind: 'text', label: '', runs: [{ text: '<img src=x onerror=alert(1)> More senses.', lang: null, emphasis: false }] },
  ] })
}

it('keeps entry codes, XML links and explanatory notes in sources after the dictionary content', async () => {
  server.use(http.get(endpoint, () => HttpResponse.json({ entries: [{ id: 'n20831', entry: entry() }] })))
  render(<WordDictionary word={word()} />)
  const article = within(await screen.findByRole('article', { name: 'اِسْمٌ' }))
  expect(article.queryByText(/n20831/)).not.toBeInTheDocument()
  expect(article.queryByRole('link', { name: /Original XML/ })).not.toBeInTheDocument()
  const sources = within(screen.getByLabelText('Dictionary sources'))
  expect(sources.getByRole('link', { name: 'Original XML · n20831' })).toBeVisible()
  expect(sources.getByText(/Dictionary senses are not the contextual verse meaning/)).toBeVisible()
  expect(sources.getByRole('link', { name: 'CC BY-SA 3.0 US' })).toBeVisible()
  expect(screen.queryByText('Selected word · 1:1:1')).not.toBeInTheDocument()
})

it('loads the mapped entry when Dictionary is displayed and preserves Arabic, senses and attribution safely', async () => {
  const requests: string[] = []
  server.use(http.get(`${quranEndpoint}/dictionary`, ({ request }) => {
    requests.push(request.url)
    expect(new URL(request.url).searchParams.get('root')).toBe('سمو')
    expect(new URL(request.url).searchParams.get('lemma')).toBe('ٱسْم')
    expect(request.headers.get('apikey')).toBe('sb_publishable_test_only')
    return HttpResponse.json({ entries: [{ id: 'n20831', entry: entry() }] })
  }))
  const user = userEvent.setup()
  render(<WordDictionary word={word()} />)
  expect(requests).toEqual([])
  expect(await screen.findByText('The name of a thing. (S, M, Msb, K.)')).toBeVisible()
  expect(requests).toEqual([`${quranEndpoint}/dictionary?${new URLSearchParams({ root: 'سمو', lemma: 'ٱسْم' })}`])
  const article = within(screen.getByRole('article', { name: 'اِسْمٌ' }))
  expect(article.getByRole('heading', { name: /اِسْمٌ/ })).toHaveAttribute('lang', 'ar')
  await user.click(article.getByRole('button', { name: 'Read full entry' }))
  expect(article.getByText('Sense 2')).toBeVisible()
  expect(article.getByText('<img src=x onerror=alert(1)> More senses.')).toBeVisible()
  expect(article.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'CC BY-SA 3.0 US' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/3.0/us/')
  expect(screen.getByText(/Dictionary senses are not the contextual verse meaning/)).toBeVisible()
})

it('reuses validated entries after changing words and discards pending results', async () => {
  const requests: string[] = []
  server.use(http.get(endpoint, ({ request }) => {
    requests.push(request.url)
    return HttpResponse.json({ entries: [{ id: 'n20831', entry: entry() }] })
  }))
  const view = render(<WordDictionary word={word()} />)
  expect(await screen.findByRole('article', { name: 'اِسْمٌ' })).toBeVisible()
  view.rerender(<WordDictionary word={buildWord({ position: 2, grammar: { status: 'unavailable' } })} />)
  expect(await screen.findByText('No verified Lane’s entry is available for this word.')).toBeVisible()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  view.rerender(<WordDictionary word={word()} />)
  expect(await screen.findByRole('article', { name: 'اِسْمٌ' })).toBeVisible()
  expect(requests).toHaveLength(1)
})

it('retries a dictionary request failure without losing focus or sending duplicate requests', async () => {
  server.use(http.get(endpoint, () => new HttpResponse(null, { status: 503 })))
  const user = userEvent.setup()
  render(<WordDictionary word={word()} />)
  expect(await screen.findByText('Dictionary temporarily unavailable.')).toBeVisible()
  const response = Promise.withResolvers<Response>()
  const requests: string[] = []
  server.use(http.get(endpoint, ({ request }) => {
    requests.push(request.url)
    return response.promise
  }))
  const retry = screen.getByRole('button', { name: 'Retry dictionary' })
  await user.click(retry)
  await user.click(retry)
  expect(retry).toHaveFocus()
  expect(requests).toHaveLength(1)
  response.resolve(HttpResponse.json({ entries: [] }))
  expect(await screen.findByText('No verified Lane’s entry is available for this word.')).toBeVisible()
  expect(screen.getByRole('region', { name: 'Lane’s dictionary' })).toHaveFocus()
  expect(screen.queryByText('Dictionary temporarily unavailable.')).not.toBeInTheDocument()
})

it('retains distinct successful entries while a failed entry offers retry and announces loading', async () => {
  server.use(http.get(endpoint, () => HttpResponse.json({ entries: [{ id: 'n20811', entry: entry('n20811') }, { id: 'n20831', entry: null }] })))
  const user = userEvent.setup()
  render(<WordDictionary word={word()} />)
  expect(await screen.findByRole('article', { name: 'اسم آخر' })).toBeVisible()
  expect(await screen.findByText('Entry n20831 is temporarily unavailable.')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('Some dictionary entries are temporarily unavailable.')
  expect(within(screen.getByLabelText('Dictionary sources')).getByText('Entry n20831 is temporarily unavailable.')).toBeVisible()
  const response = Promise.withResolvers<Response>()
  server.use(http.get(endpoint, () => response.promise))
  await user.click(screen.getByRole('button', { name: 'Retry dictionary' }))
  expect(screen.getByText('Loading dictionary…')).toHaveAttribute('role', 'status')
  expect(screen.getByRole('button', { name: 'Retry dictionary' })).toHaveAttribute('aria-disabled', 'true')
  expect(screen.getByRole('article', { name: 'اسم آخر' })).toBeVisible()
  response.resolve(HttpResponse.json({ entries: [{ id: 'n20811', entry: entry('n20811') }, { id: 'n20831', entry: entry() }] }))
  expect(await screen.findByRole('article', { name: 'اِسْمٌ' })).toBeVisible()
  expect(screen.getByRole('article', { name: 'اسم آخر' })).toBeVisible()
  expect(screen.queryByText('Entry n20831 is temporarily unavailable.')).not.toBeInTheDocument()
})

it('shows unavailable without surface matching or requests when grammar is unverified', async () => {
  const requests: string[] = []
  server.use(http.get(endpoint, ({ request }) => {
    requests.push(request.url)
    return HttpResponse.json({ entries: [] })
  }))
  render(<WordDictionary word={buildWord({ arabic: 'اِسْمٌ', grammar: { status: 'unavailable' } })} />)
  expect(await screen.findByText('No verified Lane’s entry is available for this word.')).toBeVisible()
  expect(requests).toEqual([])
})

it('discards an in-flight dictionary request when another word is selected', async () => {
  const pending = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<void>()
  server.use(http.get(endpoint, () => {
    started.resolve()
    return pending.promise
  }))
  const view = render(<WordDictionary word={word()} />)
  await started.promise
  view.rerender(<WordDictionary word={buildWord({ position: 2, grammar: { status: 'unavailable' } })} />)
  pending.resolve(HttpResponse.json({ entries: [{ id: 'n20831', entry: entry() }] }))
  expect(await screen.findByText('No verified Lane’s entry is available for this word.')).toBeVisible()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})
