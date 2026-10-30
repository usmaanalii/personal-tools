import { render, screen } from '@testing-library/react'
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

describe('Quran reader bookmarks', () => {
  it('shows the saved verse’s chapter and number when My bookmarks is selected', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: 'Bookmark verse 1' }))
    await user.click(screen.getByRole('button', { name: /My bookmarks/ }))

    expect(screen.getByRole('button', { name: /Al-Fātiḥah 1:1/ })).toBeInTheDocument()
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
  it('shows matching chapters when a chapter name is entered in Search chapters', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: 'Search chapters' }))
    const search = screen.getByRole('textbox', { name: 'Search chapters' })
    await user.type(search, 'Yūnus')

    expect(screen.getByRole('button', { name: /Yūnus/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Al-Fātiḥah/ })).not.toBeInTheDocument()
  })
})

describe('Quran reader chapter navigation', () => {
  it('shows the next available chapter when Next is selected', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: /Yūnus/ }))
    await user.click(screen.getByRole('button', { name: /NEXT/ }))

    expect(screen.getByRole('heading', { name: 'Al-Kahf' })).toBeInTheDocument()
    expect(await screen.findByText('18:1')).toBeInTheDocument()
  })
})

describe('Quran reader chapter bookmark', () => {
  it('marks the chapter bookmark as pressed when Bookmark this chapter is selected', async () => {
    const { user } = await renderReader()

    const bookmark = screen.getByRole('button', { name: 'Bookmark this chapter', pressed: false })
    await user.click(bookmark)

    expect(screen.getByRole('button', { name: 'Bookmark this chapter', pressed: true })).toBeInTheDocument()
  })
})

describe('Quran reader saved verse removal', () => {
  it('shows the empty bookmarks message when the last saved verse is unbookmarked', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: 'Bookmark verse 1' }))
    await user.click(screen.getByRole('button', { name: /My bookmarks/ }))
    await user.click(screen.getByRole('button', { name: /Al-Fātiḥah 1:1/ }))
    await user.click(screen.getByRole('button', { name: 'Bookmark verse 1', pressed: true }))

    expect(screen.getByText('Your saved verses will find a home here.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bookmark verse 1', pressed: false })).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Al-Ikhlas' })).toBeInTheDocument()
    expect(await screen.findByText('Say, “He is Allah—One.”')).toBeInTheDocument()
    expect(screen.getByText(/Dr. Mustafa Khattab/)).toBeInTheDocument()
    expect(screen.queryByText('All praise is for Allah—Lord of all worlds,')).not.toBeInTheDocument()
  })
})

describe('Quran request recovery and pagination', () => {
  it('lets readers retry chapter loading after an unavailable response', async () => {
    server.use(http.get(`${quranEndpoint}/chapters`, () => HttpResponse.json({ error: 'private server detail' }, { status: 503 })))
    window.history.pushState({}, '', '/quran/')
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Quran content is not configured yet.')
    expect(screen.queryByText(/private server detail/)).not.toBeInTheDocument()
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Retry chapters' }))
    expect(await screen.findByRole('heading', { name: 'Al-Fātiḥah' })).toBeInTheDocument()
  })

  it('loads the next verse page and opens a saved verse on its original page', async () => {
    server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'))
      return HttpResponse.json({ verses: [{ number: page === 1 ? 1 : 21, arabic: 'نص للاختبار', translationHtml: `Page ${page} translation.<sup>1</sup><script>unsafe()</script>` }], translationName: 'Dr. Mustafa Khattab, The Clear Quran', nextPage: page === 1 ? 2 : null })
    }))
    const { user } = await renderReader()
    expect(screen.getByText('Page 1 translation.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^NEXT/ }))
    await screen.findByRole('heading', { name: 'Al-Baqarah' })
    await screen.findByText('Page 1 translation.')
    await user.click(screen.getByRole('button', { name: 'Next verses' }))
    expect(await screen.findByText('Page 2 translation.')).toBeInTheDocument()
    expect(screen.queryByText('Page 1 translation.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next verses' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Bookmark verse 21' }))
    await user.click(screen.getByRole('button', { name: 'Previous verses' }))
    await screen.findByText('Page 1 translation.')
    await user.click(screen.getByRole('button', { name: /My bookmarks/ }))
    await user.click(screen.getByRole('button', { name: 'Al-Baqarah 2:21' }))
    expect(await screen.findByRole('button', { name: 'Bookmark verse 21', pressed: true })).toBeInTheDocument()
    expect(screen.queryByText(/unsafe/)).not.toBeInTheDocument()
  })

  it('hides old verses when a new chapter fails and lets readers retry', async () => {
    const { user } = await renderReader()
    server.use(http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({}, { status: 502 })))
    await user.click(screen.getByRole('button', { name: /NEXT/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable')
    expect(screen.queryByText('All praise is for Allah—Lord of all worlds,')).not.toBeInTheDocument()
    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Retry verses' }))
    expect(await screen.findByText('Test translation for chapter 2.')).toBeInTheDocument()
  })
})

describe('Pre-live translation availability', () => {
  it('shows the pre-live translation with the correct attribution', async () => {
    server.use(http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({ verses: [{ number: 1, arabic: 'نص للاختبار', translationHtml: 'Pre-live English translation.' }], translationName: 'M.A.S. Abdel Haleem', nextPage: null })))
    window.history.pushState({}, '', '/quran/')
    render(<App />)
    expect(await screen.findByText('Pre-live English translation.')).toBeInTheDocument()
    expect(screen.getByText(/M.A.S. Abdel Haleem/)).toBeInTheDocument()
    expect(screen.queryByText(/Dr. Mustafa Khattab/)).not.toBeInTheDocument()
  })
})
