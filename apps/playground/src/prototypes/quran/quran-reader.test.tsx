import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../../app/app'
import { http, HttpResponse } from 'msw'
import { server, quranEndpoint } from '../../test-server'

async function renderReader() {
  const user = userEvent.setup()
  window.history.pushState({}, '', '/quran/')
  render(<App />)
  await screen.findByRole('heading', { name: 'Al-Fātiḥah' })
  await screen.findByRole('button', { name: 'Bookmark verse 1' })
  return { user }
}

afterEach(() => window.history.pushState({}, '', '/'))

it('shows the saved verse and focuses Bookmarks when Bookmarks is selected', async () => {
  const { user } = await renderReader()
  const header = within(screen.getByRole('navigation', { name: 'Reader controls' }))
  expect(header.getByRole('button', { name: 'Chapters', pressed: true })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Bookmark verse 1' }))
  await user.click(header.getByRole('button', { name: /Bookmarks/ }))
  expect(screen.getByRole('heading', { name: 'Bookmarks 1' })).toHaveFocus()
  expect(screen.getByRole('button', { name: /Al-Fātiḥah 1:1/ })).toBeVisible()
})

it('keeps the reader shell visible and announces chapter loading', async () => {
  server.use(http.get(`${quranEndpoint}/chapters`, () => new Promise(() => {})))
  window.history.pushState({}, '', '/quran/')
  render(<App />)

  expect(await screen.findByText('Loading chapters…')).toHaveAttribute('role', 'status')
  expect(screen.getByRole('heading', { name: 'A moment with the Quran.' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Sources' })).toBeVisible()
  const reading = screen.getByRole('complementary', { name: 'Current chapter' })
  expect(reading).toHaveAttribute('aria-busy', 'true')
  expect(within(reading).queryByRole('button')).not.toBeInTheDocument()
})

it('opens Al-Baqarah when its chapter shortcut is selected', async () => {
  const { user } = await renderReader()
  await user.click(screen.getByRole('button', { name: /^Open Al-Baqarah/ }))
  expect(await screen.findByRole('heading', { name: 'Al-Baqarah' })).toBeVisible()
})

it('announces verse loading when changing chapters and shows the new translation when ready', async () => {
  const { user } = await renderReader()
  const pending = Promise.withResolvers<Response>()
  server.use(http.get(`${quranEndpoint}/verses`, () => pending.promise))
  await user.click(screen.getByRole('button', { name: /^NEXT/ }))

  expect(screen.getByRole('status')).toHaveTextContent('Loading verses…')
  expect(screen.getByRole('complementary', { name: 'Current chapter' })).not.toContainElement(screen.getByRole('status'))
  const verses = screen.getByRole('region', { name: 'Verses' })
  expect(verses).toHaveAttribute('aria-busy', 'true')
  expect(screen.queryByText('All praise is for Allah—Lord of all worlds,')).not.toBeInTheDocument()
  pending.resolve(HttpResponse.json({ verses: [{ number: 1, arabic: 'نص للاختبار', translationHtml: 'New chapter text.' }], translationName: 'Translator', nextPage: null }))

  expect(await screen.findByText('New chapter text.')).toBeVisible()
  expect(verses).toHaveAttribute('aria-busy', 'false')
})

describe('Quran reader bookmarks', () => {
  it('announces which chapter view is selected when switching to Bookmarks', async () => {
    const { user } = await renderReader()
    expect(screen.getByRole('button', { name: 'Chapters', pressed: true })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Bookmarks/, pressed: false }))
    expect(screen.getByRole('button', { name: /Bookmarks/, pressed: true })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Chapters', pressed: false })).toBeVisible()
    expect(screen.getByText('Your saved verses will find a home here.')).toBeVisible()
  })

  it('marks the verse bookmark as pressed when Bookmark verse is selected', async () => {
    const { user } = await renderReader()
    const bookmark = screen.getByRole('button', { name: 'Bookmark verse 1' })

    expect(bookmark).toHaveAttribute('aria-pressed', 'false')
    await user.click(bookmark)
    expect(bookmark).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Quran reader chapter search', () => {
  it('announces no matching chapters and retains the query when changing views', async () => {
    const { user } = await renderReader()
    const url = window.location.href
    await user.click(screen.getByRole('button', { name: 'Search chapters' }))
    await user.type(screen.getByRole('textbox', { name: 'Search chapters' }), 'unknown chapter')
    expect(screen.getByRole('status')).toHaveTextContent('No chapters match this search.')
    await user.click(within(screen.getByRole('navigation', { name: 'Reader controls' })).getByRole('button', { name: /Bookmarks/ }))
    await user.click(screen.getByRole('button', { name: 'Chapters' }))
    expect(screen.getByRole('textbox', { name: 'Search chapters' })).toHaveValue('unknown chapter')
    expect(window.location.href).toBe(url)
  })

  it('returns focus to Search chapters and clears the query when search is closed', async () => {
    const { user } = await renderReader()
    const toggle = screen.getByRole('button', { name: 'Search chapters' })
    await user.click(toggle)
    await user.type(screen.getByRole('textbox', { name: 'Search chapters' }), 'Yūnus')
    await user.click(screen.getByRole('button', { name: 'Close search' }))

    expect(toggle).toHaveFocus()
    await user.click(toggle)
    expect(screen.getByRole('textbox', { name: 'Search chapters' })).toHaveValue('')
    expect(screen.getByRole('button', { name: /Al-Fātiḥah/ })).toBeVisible()
  })

  it('shows matching chapters when a chapter name is entered in Search chapters', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: 'Search chapters' }))
    const search = screen.getByRole('textbox', { name: 'Search chapters' })
    await user.type(search, 'Yūnus')

    expect(screen.getByRole('button', { name: /Yūnus/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: /Al-Fātiḥah/ })).not.toBeInTheDocument()
  })
})

describe('Quran reader chapter navigation', () => {
  it('shows the next available chapter when Next is selected', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: /Yūnus/ }))
    await user.click(screen.getByRole('button', { name: /NEXT/ }))

    expect(screen.getByRole('heading', { name: 'Al-Kahf' })).toBeVisible()
    expect(await screen.findByText('18:1')).toBeVisible()
  })
})

describe('Quran reader chapter bookmark', () => {
  it('marks the chapter bookmark as pressed when Bookmark this chapter is selected', async () => {
    const { user } = await renderReader()

    const bookmark = screen.getByRole('button', { name: 'Bookmark this chapter', pressed: false })
    await user.click(bookmark)

    expect(screen.getByRole('button', { name: 'Bookmark this chapter', pressed: true })).toBeVisible()
  })
})

describe('Quran reader saved verse removal', () => {
  it('shows the empty bookmarks message when the last saved verse is unbookmarked', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: 'Bookmark verse 1' }))
    await user.click(within(screen.getByRole('navigation', { name: 'Reader controls' })).getByRole('button', { name: /Bookmarks/ }))
    await user.click(screen.getByRole('button', { name: /Al-Fātiḥah 1:1/ }))
    await user.click(screen.getByRole('button', { name: 'Bookmark verse 1', pressed: true }))

    expect(screen.getByText('Your saved verses will find a home here.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Bookmark verse 1', pressed: false })).toBeVisible()
  })
})

describe('Quran API content', () => {
  it('shows the API chapter and its verses with translation attribution', async () => {
    server.use(
      http.get(`${quranEndpoint}/chapters`, () => HttpResponse.json({ chapters: [{ id: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', meaning: 'Sincerity', verses: 4, place: 'Meccan' }] })),
      http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({ verses: [{ number: 1, arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', translationHtml: 'Say, “He is Allah—One.”' }], translationName: 'Dr. Mustafa Khattab, The Clear Quran', nextPage: null })),
    )
    window.history.pushState({}, '', '/quran/')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Al-Ikhlas' })).toBeVisible()
    expect(await screen.findByText('Say, “He is Allah—One.”')).toBeVisible()
    expect(screen.getByText(/Dr. Mustafa Khattab/)).toBeVisible()
    expect(screen.queryByText('All praise is for Allah—Lord of all worlds,')).not.toBeInTheDocument()
  })
})

describe('Quran request recovery and pagination', () => {
  it('cancels the previous verse request when another chapter is opened', async () => {
    const olderRequest = new Promise<AbortSignal>(started => {
      server.use(http.get(`${quranEndpoint}/verses`, async ({ request }) => {
        const chapter = new URL(request.url).searchParams.get('chapter')
        if (chapter === '1') {
          started(request.signal)
          await new Promise<void>(resolve => request.signal.addEventListener('abort', () => resolve(), { once: true }))
        }
        return HttpResponse.json({
          verses: [{ number: 1, arabic: 'نص للاختبار', translationHtml: `Translation for chapter ${chapter}.` }],
          translationName: 'Verse translator', nextPage: null,
        })
      }))
    })
    const user = userEvent.setup()
    window.history.pushState({}, '', '/quran/')
    render(<App />)
    const signal = await olderRequest

    await user.click(screen.getByRole('button', { name: /^Open Al-Baqarah/ }))

    expect(await screen.findByText('Translation for chapter 2.')).toBeVisible()
    expect(signal.aborted).toBe(true)
    expect(screen.queryByText('Translation for chapter 1.')).not.toBeInTheDocument()
  })

  it('lets readers retry chapter loading after an unavailable response', async () => {
    server.use(http.get(`${quranEndpoint}/chapters`, () => HttpResponse.json({ error: 'private server detail' }, { status: 503 })))
    window.history.pushState({}, '', '/quran/')
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Quran content is not configured yet.')
    expect(screen.getByRole('heading', { name: 'A moment with the Quran.' })).toBeVisible()
    const reading = screen.getByRole('complementary', { name: 'Current chapter' })
    expect(reading).toHaveAttribute('aria-busy', 'false')
    expect(screen.queryByText(/private server detail/)).not.toBeInTheDocument()
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Retry chapters' }))
    expect(await screen.findByRole('heading', { name: 'Al-Fātiḥah' })).toBeVisible()
  })

  it('loads the next verse page and opens a saved verse on its original page', async () => {
    server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'))
      return HttpResponse.json({ verses: [{ number: page === 1 ? 1 : 21, arabic: 'نص للاختبار', translationHtml: `Page ${page} translation.` }], translationName: 'Dr. Mustafa Khattab, The Clear Quran', nextPage: page === 1 ? 2 : null })
    }))
    const { user } = await renderReader()
    expect(screen.getByText('Page 1 translation.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /^NEXT/ }))
    await screen.findByRole('heading', { name: 'Al-Baqarah' })
    await screen.findByText('Page 1 translation.')
    await user.click(screen.getByRole('button', { name: 'Next verses' }))
    expect(await screen.findByText('Page 2 translation.')).toBeVisible()
    expect(screen.queryByText('Page 1 translation.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next verses' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Bookmark verse 21' }))
    await user.click(screen.getByRole('button', { name: 'Previous verses' }))
    await screen.findByText('Page 1 translation.')
    await user.click(within(screen.getByRole('navigation', { name: 'Reader controls' })).getByRole('button', { name: /Bookmarks/ }))
    await user.click(screen.getByRole('button', { name: 'Al-Baqarah 2:21' }))
    expect(await screen.findByRole('button', { name: 'Bookmark verse 21', pressed: true })).toBeVisible()
  })

  it('hides old verses when a new chapter fails and lets readers retry', async () => {
    const { user } = await renderReader()
    server.use(http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({}, { status: 502 })))
    await user.click(screen.getByRole('button', { name: /NEXT/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable')
    expect(screen.queryByText('All praise is for Allah—Lord of all worlds,')).not.toBeInTheDocument()
    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Retry verses' }))
    expect(await screen.findByText('Test translation for chapter 2.')).toBeVisible()
  })
})

describe('Translation attribution', () => {
  it('shows the supplied translation and translator attribution', async () => {
    server.use(http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({ verses: [{ number: 1, arabic: 'نص للاختبار', translationHtml: 'Pre-live English translation.' }], translationName: 'M.A.S. Abdel Haleem', nextPage: null })))
    window.history.pushState({}, '', '/quran/')
    render(<App />)
    expect(await screen.findByText('Pre-live English translation.')).toBeVisible()
    expect(screen.getByText(/M.A.S. Abdel Haleem/)).toBeVisible()
    expect(screen.queryByText(/Dr. Mustafa Khattab/)).not.toBeInTheDocument()
  })
})
