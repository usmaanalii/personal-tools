import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../../app/app'

async function renderReader() {
  const user = userEvent.setup()
  window.history.pushState({}, '', '/quran/')
  render(<App />)
  await screen.findByRole('heading', { name: 'Al-Fātiḥah' })
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
  it('shows the next sample chapter when Next is selected', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: /Yūnus/ }))
    await user.click(screen.getByRole('button', { name: /NEXT/ }))

    expect(screen.getByRole('heading', { name: 'Al-Kahf' })).toBeInTheDocument()
    expect(screen.getByText('18:1')).toBeInTheDocument()
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
