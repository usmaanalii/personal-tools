import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server, quranEndpoint } from '../../test-server'
import { renderReader } from './quran-reader.test-render'
import { searchService } from './search-service'

afterEach(() => window.history.pushState({}, '', '/'))

it('opens a separate Quran search destination', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  expect(screen.getByRole('heading', { name: 'Search', level: 1 })).toHaveFocus()
  expect(screen.getByRole('textbox', { name: 'Search the Quran' })).toBeVisible()
  expect(screen.queryByRole('region', { name: 'Verses' })).not.toBeInTheDocument()
})

it('focuses Search when returning after using reader navigation', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.click(screen.getByRole('button', { name: 'Read' }))
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  expect(screen.getByRole('heading', { name: 'Search', level: 1 })).toHaveFocus()
})

it('focuses Search when opened from Chapters', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: 'Chapters' }))
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  expect(screen.getByRole('heading', { name: 'Search', level: 1 })).toHaveFocus()
})

it('opens a direct verse reference from Search', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:3')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(await screen.findByText('1:3')).toBeVisible()
  expect(screen.getByText('1:3').closest('article')).toHaveFocus()
})

it('retains the reference when returning to Search', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:3')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  await screen.findByText('1:3')
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  expect(screen.getByRole('textbox', { name: 'Search the Quran' })).toHaveValue('1:3')
})

it('restores the saved Search scroll offset when returning from Read', async () => {
  const scrollingElement = document.documentElement
  const original = Object.getOwnPropertyDescriptor(document, 'scrollingElement')
  Object.defineProperty(document, 'scrollingElement', { configurable: true, value: scrollingElement })
  const scrollY = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(250)
  try {
    const { user } = await renderReader()
    await user.click(screen.getByRole('button', { name: /^Search$/ }))
    await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:3')
    await user.click(screen.getByRole('button', { name: 'Search Quran' }))
    await screen.findByText('1:3')
    await user.click(screen.getByRole('button', { name: /^Search$/ }))
    expect(scrollingElement.scrollTop).toBe(250)
  } finally {
    scrollY.mockRestore()
    if (original) Object.defineProperty(document, 'scrollingElement', original)
    else Reflect.deleteProperty(document, 'scrollingElement')
    scrollingElement.scrollTop = 0
  }
})

it('removes the verse highlight after navigation', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:3')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  const verse = (await screen.findByText('1:3')).closest('article')
  expect(verse).toHaveClass('bg-ui-background')
  await waitFor(() => expect(verse).not.toHaveClass('bg-ui-background'), { timeout: 3500 })
})

it('clears the verse highlight when leaving and returning to Read', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:3')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(screen.getByText('1:3').closest('article')).toHaveClass('bg-ui-background')
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.click(screen.getByRole('button', { name: 'Read' }))
  expect(screen.getByText('1:3').closest('article')).not.toHaveClass('bg-ui-background')
})

it('preserves a verse activation made while the navigation highlight is visible', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:3')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  const bookmark = await screen.findByRole('button', { name: 'Bookmark verse 3' })
  expect(bookmark.closest('article')).toHaveClass('bg-ui-background')
  await user.click(bookmark)
  await new Promise(resolve => setTimeout(resolve, 2200))
  expect(bookmark).toHaveAttribute('aria-pressed', 'true')
  expect(bookmark.closest('article')).toHaveClass('bg-ui-background')
})

it('shows attributed, limited results from the Quran function', async () => {
  server.use(http.get(`${quranEndpoint}/search`, ({ request }) => {
    expect(new URL(request.url).searchParams.get('query')).toBe('mercy')
    return HttpResponse.json({ status: 'ready', results: [{ chapter: 1, verse: 3, chapterName: 'Al-Fatihah', arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', translation: 'the Lord of Mercy', translationName: 'M.A.S. Abdel Haleem' }], nextPage: null, coverage: 'limited' })
  }))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), 'mercy')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(await screen.findByRole('button', { name: /Al-Fatihah 1:3/ })).toBeVisible()
  expect(screen.getByText('M.A.S. Abdel Haleem')).toBeVisible()
  expect(screen.getByText('Searching Al-Fatihah and Al-Baqarah only.')).toBeVisible()
})

it('opens a result from the search service', async () => {
  const search = vi.spyOn(searchService, 'search').mockResolvedValue({ status: 'ready', results: [{ chapter: 1, verse: 3, chapterName: 'Al-Fātiḥah', arabic: 'نص', translation: 'Result translation', translationName: 'Translator' }], nextPage: null, coverage: 'complete' })
  try {
    const { user } = await renderReader()
    await user.click(screen.getByRole('button', { name: /^Search$/ }))
    await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), 'mercy')
    await user.click(screen.getByRole('button', { name: 'Search Quran' }))
    await user.click(await screen.findByRole('button', { name: /Al-Fātiḥah 1:3/ }))
    expect((await screen.findByText('1:3')).closest('article')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: /^Search$/ }))
    expect(screen.getByRole('button', { name: /Al-Fātiḥah 1:3/ })).toHaveFocus()
  } finally {
    search.mockRestore()
  }
})

it('restores the selected result page after returning from Read', async () => {
  const search = vi.spyOn(searchService, 'search')
    .mockResolvedValueOnce({ status: 'ready', results: [{ chapter: 1, verse: 2, chapterName: 'Al-Fātiḥah', arabic: 'نص', translation: 'First page', translationName: 'Translator' }], nextPage: 'next', coverage: 'complete' })
    .mockResolvedValueOnce({ status: 'ready', results: [{ chapter: 1, verse: 3, chapterName: 'Al-Fātiḥah', arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', translation: 'Second page', translationName: 'Translator' }], nextPage: null, coverage: 'complete' })
  try {
    const { user } = await renderReader()
    await user.click(screen.getByRole('button', { name: /^Search$/ }))
    await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), 'mercy')
    await user.click(screen.getByRole('button', { name: 'Search Quran' }))
    await user.click(await screen.findByRole('button', { name: 'Next results' }))
    await user.click(await screen.findByRole('button', { name: /Al-Fātiḥah 1:3/ }))
    await screen.findByText('1:3')
    await user.click(screen.getByRole('button', { name: /^Search$/ }))
    expect(screen.getByText('Second page')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Search the Quran' })).toHaveValue('mercy')
    expect(screen.getByRole('button', { name: /Al-Fātiḥah 1:3/ })).toHaveFocus()
  } finally {
    search.mockRestore()
  }
})

it('clears a result navigation error after selecting an available verse', async () => {
  server.use(http.get(`${quranEndpoint}/chapters`, () => HttpResponse.json({ chapters: [{ id: 1, name: 'Al-Fātiḥah', arabic: 'الفاتحة', meaning: 'The Opening', verses: 7, place: 'Meccan' }] })))
  const search = vi.spyOn(searchService, 'search').mockResolvedValue({ status: 'ready', results: [
    { chapter: 2, verse: 255, chapterName: 'Al-Baqarah', arabic: 'نص', translation: 'Unavailable result', translationName: 'Translator' },
    { chapter: 1, verse: 3, chapterName: 'Al-Fātiḥah', arabic: 'نص', translation: 'Available result', translationName: 'Translator' },
  ], nextPage: null, coverage: 'limited' })
  try {
    const { user } = await renderReader()
    await user.click(screen.getByRole('button', { name: /^Search$/ }))
    await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), 'mercy')
    await user.click(screen.getByRole('button', { name: 'Search Quran' }))
    await user.click(await screen.findByRole('button', { name: /Al-Baqarah 2:255/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('This chapter is unavailable in the current content.')
    await user.click(screen.getByRole('button', { name: /Al-Fātiḥah 1:3/ }))
    await screen.findByText('1:3')
    await user.click(screen.getByRole('button', { name: /^Search$/ }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  } finally {
    search.mockRestore()
  }
})

it('explains when a verse reference is out of range', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:8')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid chapter and verse reference.')
  expect(screen.getByRole('textbox', { name: 'Search the Quran' })).toHaveAttribute('aria-invalid', 'true')
})

it('opens the last verse of a chapter', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:7')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect((await screen.findByText('1:7')).closest('article')).toHaveFocus()
})

it('clears reference errors when the query is edited', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  const input = screen.getByRole('textbox', { name: 'Search the Quran' })
  await user.type(input, '1:8')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid chapter and verse reference.')
  await user.clear(input)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('reports a malformed reference', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid chapter and verse reference.')
})

it('explains when the requested chapter is unavailable', async () => {
  server.use(http.get(`${quranEndpoint}/chapters`, () => HttpResponse.json({ chapters: [{ id: 1, name: 'Al-Fātiḥah', arabic: 'الفاتحة', meaning: 'The Opening', verses: 7, place: 'Meccan' }] })))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '2:255')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(screen.getByRole('alert')).toHaveTextContent('This chapter is unavailable in the current content.')
})

it('rejects verse zero even when the chapter is unavailable', async () => {
  server.use(http.get(`${quranEndpoint}/chapters`, () => HttpResponse.json({ chapters: [{ id: 1, name: 'Al-Fātiḥah', arabic: 'الفاتحة', meaning: 'The Opening', verses: 7, place: 'Meccan' }] })))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '2:0')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid chapter and verse reference.')
})

it.each(['0:1', '115:1', '1:0', '1:287'])('rejects the out-of-range reference %s', async reference => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), reference)
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid chapter and verse reference.')
})

it('loads and focuses a verse on an unloaded page', async () => {
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const params = new URL(request.url).searchParams
    if (params.get('chapter') === '2' && params.get('page') === '13') {
      return HttpResponse.json({ verses: [{ number: 255, arabic: 'نص للاختبار', translationHtml: 'Verse 255.' }], translationName: 'Translator', nextPage: null })
    }
    return HttpResponse.json({ verses: [{ number: 1, arabic: 'نص للاختبار', translationHtml: 'Opening.' }], translationName: 'Translator', nextPage: null })
  }))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '2:255')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect((await screen.findByText('2:255')).closest('article')).toHaveFocus()
})

it('reports when a requested verse is missing from the loaded page', async () => {
  server.use(http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({ verses: [{ number: 1, arabic: 'نص', translationHtml: 'Opening.' }], translationName: 'Translator', nextPage: null })))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:3')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('The requested verse is unavailable.')
})

it('cancels the earlier request and focuses the latest verse selection', async () => {
  const pending = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<Request>()
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const params = new URL(request.url).searchParams
    if (params.get('chapter') === '2') {
      started.resolve(request)
      return pending.promise
    }
    return HttpResponse.json({ verses: [{ number: 1, arabic: 'نص', translationHtml: 'First.' }, { number: 3, arabic: 'نص', translationHtml: 'Third.' }], translationName: 'Translator', nextPage: null })
  }))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  const input = screen.getByRole('textbox', { name: 'Search the Quran' })
  await user.type(input, '2:255')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  const earlierRequest = await started.promise
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.clear(screen.getByRole('textbox', { name: 'Search the Quran' }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '1:3')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  expect((await screen.findByText('1:3')).closest('article')).toHaveFocus()
  expect(earlierRequest.signal.aborted).toBe(true)
  await act(async () => { pending.resolve(HttpResponse.json({ verses: [{ number: 255, arabic: 'نص', translationHtml: 'Older.' }], translationName: 'Translator', nextPage: null })) })
  expect(screen.queryByText('Older.')).not.toBeInTheDocument()
})

it('cancels a pending verse jump when a chapter is selected', async () => {
  const pending = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<Request>()
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    if (new URL(request.url).searchParams.get('chapter') === '2') {
      started.resolve(request)
      return pending.promise
    }
    return HttpResponse.json({ verses: [{ number: 1, arabic: 'نص', translationHtml: 'Opening.' }], translationName: 'Translator', nextPage: null })
  }))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '2:255')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  const earlierRequest = await started.promise
  await user.click(screen.getByRole('button', { name: 'Chapters' }))
  await user.click(screen.getByRole('button', { name: /Al-Fātiḥah/ }))
  expect(await screen.findByText('Opening.')).toBeVisible()
  expect(earlierRequest.signal.aborted).toBe(true)
  expect(screen.queryByText('The requested verse is unavailable.')).not.toBeInTheDocument()
  await act(async () => { pending.resolve(HttpResponse.json({ verses: [{ number: 255, arabic: 'نص', translationHtml: 'Older.' }], translationName: 'Translator', nextPage: null })) })
  expect(screen.queryByText('Older.')).not.toBeInTheDocument()
})

it('does not highlight a verse from a cancelled jump in another chapter', async () => {
  const pending = Promise.withResolvers<Response>()
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    if (new URL(request.url).searchParams.get('chapter') === '2') return pending.promise
    return HttpResponse.json({ verses: [{ number: 1, arabic: 'نص', translationHtml: 'Opening.' }], translationName: 'Translator', nextPage: null })
  }))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '2:1')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  await user.click(screen.getByRole('button', { name: 'Chapters' }))
  await user.click(screen.getByRole('button', { name: /Al-Fātiḥah/ }))
  expect((await screen.findByText('1:1')).closest('article')).not.toHaveClass('bg-ui-background')
  await act(async () => { pending.resolve(HttpResponse.json({ verses: [{ number: 1, arabic: 'نص', translationHtml: 'Older.' }], translationName: 'Translator', nextPage: null })) })
})

it('cancels a pending verse jump when the reader changes page', async () => {
  const pending = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<Request>()
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const params = new URL(request.url).searchParams
    if (params.get('page') === '13') {
      started.resolve(request)
      return pending.promise
    }
    return HttpResponse.json({ verses: [{ number: params.get('page') === '12' ? 221 : 1, arabic: 'نص', translationHtml: 'Current page.' }], translationName: 'Translator', nextPage: null })
  }))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '2:255')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  const earlierRequest = await started.promise
  await user.click(screen.getByRole('button', { name: 'Previous verses' }))
  expect(await screen.findByText('2:221')).toBeVisible()
  expect(earlierRequest.signal.aborted).toBe(true)
  expect(screen.queryByText('The requested verse is unavailable.')).not.toBeInTheDocument()
  await act(async () => { pending.resolve(HttpResponse.json({ verses: [{ number: 255, arabic: 'نص', translationHtml: 'Older.' }], translationName: 'Translator', nextPage: null })) })
})

it('does not restore a cancelled highlight when the reader later opens that page', async () => {
  const pending = Promise.withResolvers<Response>()
  const secondPage = vi.fn().mockReturnValueOnce(pending.promise).mockReturnValue(HttpResponse.json({ verses: [{ number: 21, arabic: 'نص', translationHtml: 'Page two.' }], translationName: 'Translator', nextPage: null }))
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const params = new URL(request.url).searchParams
    if (params.get('page') === '2') return secondPage()
    return HttpResponse.json({ verses: [{ number: 1, arabic: 'نص', translationHtml: 'First page.' }], translationName: 'Translator', nextPage: 2 })
  }))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '2:21')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  await user.click(screen.getByRole('button', { name: 'Previous verses' }))
  await screen.findByText('2:1')
  await user.click(screen.getByRole('button', { name: 'Next verses' }))
  expect((await screen.findByText('2:21')).closest('article')).not.toHaveClass('bg-ui-background')
  await act(async () => { pending.resolve(HttpResponse.json({ verses: [{ number: 21, arabic: 'نص', translationHtml: 'Old response.' }], translationName: 'Translator', nextPage: null })) })
})

it('cancels a pending search jump when a bookmark is opened', async () => {
  const pending = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<Request>()
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    if (new URL(request.url).searchParams.get('chapter') === '2') {
      started.resolve(request)
      return pending.promise
    }
    return HttpResponse.json({ verses: [{ number: 1, arabic: 'نص', translationHtml: 'Opening.' }], translationName: 'Translator', nextPage: null })
  }))
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: 'Bookmark verse 1' }))
  await user.click(screen.getByRole('button', { name: /^Search$/ }))
  await user.type(screen.getByRole('textbox', { name: 'Search the Quran' }), '2:255')
  await user.click(screen.getByRole('button', { name: 'Search Quran' }))
  const earlierRequest = await started.promise
  await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
  await user.click(screen.getByRole('button', { name: /Al-Fātiḥah 1:1/ }))
  expect(await screen.findByRole('button', { name: 'Bookmark verse 1' })).toHaveFocus()
  expect(earlierRequest.signal.aborted).toBe(true)
  await act(async () => { pending.resolve(HttpResponse.json({ verses: [{ number: 255, arabic: 'نص', translationHtml: 'Older.' }], translationName: 'Translator', nextPage: null })) })
  expect(screen.queryByText('Older.')).not.toBeInTheDocument()
})
