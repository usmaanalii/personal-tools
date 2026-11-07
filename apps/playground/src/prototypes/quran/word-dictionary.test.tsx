/// <reference lib="es2024.promise" />
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server, quranEndpoint } from '../../test-server'
import { buildLanePage, buildWord } from './quran-fixtures.test-data'
import { importCorpus } from '../../../scripts/quran-data/corpus'
import { WordGrammarSchema, LaneEntrySchema, LanePageResponseSchema } from '@scratch-pages/api-contracts/quran'
import { WordDictionary } from './word-dictionary'

const endpoint = `${quranEndpoint}/dictionary/entries`
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

function serveSelectedEntry(selectedEntry = entry()) {
  server.use(http.get(endpoint, ({ request }) => {
    const query = new URL(request.url).searchParams
    if (query.get('root') !== 'سمو' || query.get('lemma') !== 'ٱسْم' || request.headers.get('apikey') !== 'sb_publishable_test_only') {
      return new HttpResponse(null, { status: 400 })
    }
    return HttpResponse.json(buildLanePage({ entries: [{ id: selectedEntry.id, entry: selectedEntry }] }))
  }))
}

it('shows every dictionary result across bounded pages, including the thirteenth entry', async () => {
  const entries = Array.from({ length: 13 }, (_, index) => ({ id: `n${100 + index}`, entry: entry(`n${100 + index}`) }))
  const revision = 'a'.repeat(64)
  const cursor = `${revision}.12.${'b'.repeat(64)}`
  server.use(http.get(`${quranEndpoint}/dictionary/entries`, ({ request }) => {
    const continued = new URL(request.url).searchParams.get('cursor')
    return HttpResponse.json(LanePageResponseSchema.parse({ entries: continued ? entries.slice(12) : entries.slice(0, 12), entryIds: entries.map(item => item.id), revision, nextCursor: continued ? null : cursor }))
  }))
  render(<WordDictionary word={word()} />)
  expect(await screen.findAllByRole('article')).toHaveLength(13)
  expect(within(screen.getByLabelText('Dictionary sources')).getByRole('link', { name: 'Original XML · n112' })).toBeVisible()
})

it('retains loaded entries and retries when a continuation fails', async () => {
  const results = Array.from({ length: 13 }, (_, index) => ({ id: `n${100 + index}`, entry: entry(`n${100 + index}`) }))
  const cursor = `${'a'.repeat(64)}.12.${'b'.repeat(64)}`
  server.use(http.get(endpoint, ({ request }) => new URL(request.url).searchParams.has('cursor')
    ? new HttpResponse(null, { status: 503 })
    : HttpResponse.json(buildLanePage({ entries: results.slice(0, 12), entryIds: results.map(item => item.id), nextCursor: cursor }))))
  const user = userEvent.setup()
  render(<WordDictionary word={word()} />)
  expect(await screen.findAllByRole('article')).toHaveLength(12)
  expect(await screen.findByText('Entry n112 is temporarily unavailable.')).toBeVisible()
  server.use(http.get(endpoint, ({ request }) => HttpResponse.json(buildLanePage({ entries: new URL(request.url).searchParams.has('cursor') ? results.slice(12) : results.slice(0, 12), entryIds: results.map(item => item.id), nextCursor: new URL(request.url).searchParams.has('cursor') ? null : cursor }))))
  await user.click(screen.getByRole('button', { name: 'Retry dictionary' }))
  expect(await within(screen.getByLabelText('Dictionary sources')).findByRole('link', { name: 'Original XML · n112' })).toBeVisible()
  expect(screen.getAllByRole('article')).toHaveLength(13)
  expect(screen.queryByText('Entry n112 is temporarily unavailable.')).not.toBeInTheDocument()
})

it('rejects continuation results from a changed catalogue without discarding the loaded page', async () => {
  const results = Array.from({ length: 13 }, (_, index) => ({ id: `n${100 + index}`, entry: entry(`n${100 + index}`) }))
  const cursor = `${'a'.repeat(64)}.12.${'b'.repeat(64)}`
  server.use(http.get(endpoint, ({ request }) => {
    const continued = new URL(request.url).searchParams.has('cursor')
    return HttpResponse.json(buildLanePage({ entries: continued ? results.slice(12) : results.slice(0, 12), entryIds: results.map(item => item.id), revision: (continued ? 'c' : 'a').repeat(64), nextCursor: continued ? null : cursor }))
  }))
  render(<WordDictionary word={word()} />)
  expect(await screen.findByText('Entry n112 is temporarily unavailable.')).toBeVisible()
  expect(screen.getAllByRole('article')).toHaveLength(12)
})

it('stops a repeated continuation instead of requesting it indefinitely', async () => {
  const results = Array.from({ length: 13 }, (_, index) => ({ id: `n${100 + index}`, entry: entry(`n${100 + index}`) }))
  const requests: string[] = []
  server.use(http.get(endpoint, ({ request }) => {
    requests.push(request.url)
    if (requests.length > 2) return new HttpResponse(null, { status: 503 })
    return HttpResponse.json(buildLanePage({ entries: results.slice(0, 12), entryIds: results.map(item => item.id), nextCursor: `${'a'.repeat(64)}.12.${'b'.repeat(64)}` }))
  }))
  render(<WordDictionary word={word()} />)
  expect(await screen.findByText('Entry n112 is temporarily unavailable.')).toBeVisible()
  expect(screen.getAllByRole('article')).toHaveLength(12)
  expect(requests).toHaveLength(2)
})

it('groups dictionary attribution and entry links in Dictionary sources', async () => {
  const selectedEntry = entry()
  serveSelectedEntry(selectedEntry)
  render(<WordDictionary word={word()} />)
  const article = within(await screen.findByRole('article', { name: 'اِسْمٌ' }))
  expect(article.queryByText(/n20831/)).not.toBeInTheDocument()
  expect(article.queryByRole('link', { name: /Original XML/ })).not.toBeInTheDocument()
  const sources = within(screen.getByLabelText('Dictionary sources'))
  const original = sources.getByRole('link', { name: 'Original XML · n20831' })
  expect(original).toBeVisible()
  expect(original).toHaveAttribute('href', selectedEntry.sourceUrl)
  expect(sources.getByText(/Dictionary senses are not the contextual verse meaning/)).toBeVisible()
  const licence = sources.getByRole('link', { name: 'CC BY-SA 3.0 US' })
  expect(licence).toBeVisible()
  expect(licence).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/3.0/us/')
})

it('shows the dictionary entry for the selected word', async () => {
  serveSelectedEntry()
  render(<WordDictionary word={word()} />)

  expect(await screen.findByText('The name of a thing. (S, M, Msb, K.)')).toBeVisible()
  const article = within(screen.getByRole('article', { name: 'اِسْمٌ' }))
  expect(article.getByRole('heading', { name: /اِسْمٌ/ })).toHaveAttribute('lang', 'ar')
})

it('shows the remaining senses as safe text when Read full entry is selected', async () => {
  serveSelectedEntry()
  const user = userEvent.setup()
  render(<WordDictionary word={word()} />)
  const article = within(await screen.findByRole('article', { name: 'اِسْمٌ' }))

  await user.click(article.getByRole('button', { name: 'Read full entry' }))

  expect(article.getByText('Sense 2')).toBeVisible()
  expect(article.getByText('<img src=x onerror=alert(1)> More senses.')).toBeVisible()
  expect(article.queryByRole('img')).not.toBeInTheDocument()
})

it('reuses the dictionary entry when its word is selected again', async () => {
  const requests: string[] = []
  server.use(http.get(endpoint, ({ request }) => {
    requests.push(request.url)
    return HttpResponse.json(buildLanePage({ entries: [{ id: 'n20831', entry: entry() }] }))
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
  response.resolve(HttpResponse.json(buildLanePage({ entries: [] })))
  expect(await screen.findByText('No verified Lane’s entry is available for this word.')).toBeVisible()
  expect(screen.getByRole('region', { name: 'Lane’s dictionary' })).toHaveFocus()
  expect(screen.queryByText('Dictionary temporarily unavailable.')).not.toBeInTheDocument()
})

it('retains distinct successful entries while a failed entry offers retry and announces loading', async () => {
  server.use(http.get(endpoint, () => HttpResponse.json(buildLanePage({ entries: [{ id: 'n20811', entry: entry('n20811') }, { id: 'n20831', entry: null }] }))))
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
  response.resolve(HttpResponse.json(buildLanePage({ entries: [{ id: 'n20811', entry: entry('n20811') }, { id: 'n20831', entry: entry() }] })))
  expect(await screen.findByRole('article', { name: 'اِسْمٌ' })).toBeVisible()
  expect(screen.getByRole('article', { name: 'اسم آخر' })).toBeVisible()
  expect(screen.queryByText('Entry n20831 is temporarily unavailable.')).not.toBeInTheDocument()
})

it('shows unavailable without surface matching or requests when grammar is unverified', async () => {
  const requests: string[] = []
  server.use(http.get(endpoint, ({ request }) => {
    requests.push(request.url)
    return HttpResponse.json(buildLanePage({ entries: [] }))
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
  pending.resolve(HttpResponse.json(buildLanePage({ entries: [{ id: 'n20831', entry: entry() }] })))
  expect(await screen.findByText('No verified Lane’s entry is available for this word.')).toBeVisible()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})
