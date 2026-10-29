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
  it('shows a verse by its chapter and number after saving it', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: 'Bookmark verse 1' }))
    await user.click(screen.getByRole('button', { name: /My bookmarks/ }))

    expect(screen.getByRole('button', { name: /Al-Fātiḥah 1:1/ })).toBeInTheDocument()
  })

  it('announces when a verse bookmark is saved', async () => {
    const { user } = await renderReader()
    const bookmark = screen.getByRole('button', { name: 'Bookmark verse 1' })

    expect(bookmark).toHaveAttribute('aria-pressed', 'false')
    await user.click(bookmark)
    expect(bookmark).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Quran reader chapter search', () => {
  it('filters the chapter list by the accessible search field', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: 'Search chapters' }))
    const search = screen.getByRole('textbox', { name: 'Search chapters' })
    await user.type(search, 'Yūnus')

    expect(screen.getByRole('button', { name: /Yūnus/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Al-Fātiḥah/ })).not.toBeInTheDocument()
  })
})

describe('Quran reader chapter navigation', () => {
  it('moves between available sample chapters', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: /Yūnus/ }))
    await user.click(screen.getByRole('button', { name: /NEXT/ }))

    expect(screen.getByRole('heading', { name: 'Al-Kahf' })).toBeInTheDocument()
    expect(screen.getByText('18:1')).toBeInTheDocument()
  })
})

describe('Quran reader chapter bookmark', () => {
  it('exposes whether the current chapter is bookmarked', async () => {
    const { user } = await renderReader()

    const bookmark = screen.getByRole('button', { name: 'Bookmark this chapter', pressed: false })
    await user.click(bookmark)

    expect(screen.getByRole('button', { name: 'Bookmark this chapter', pressed: true })).toBeInTheDocument()
  })
})

describe('Quran reader saved verse removal', () => {
  it('removes a verse from the saved list when it is unbookmarked', async () => {
    const { user } = await renderReader()

    await user.click(screen.getByRole('button', { name: 'Bookmark verse 1' }))
    await user.click(screen.getByRole('button', { name: /My bookmarks/ }))
    await user.click(screen.getByRole('button', { name: /Al-Fātiḥah 1:1/ }))
    await user.click(screen.getByRole('button', { name: 'Bookmark verse 1', pressed: true }))

    expect(screen.getByText('Your saved verses will find a home here.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bookmark verse 1', pressed: false })).toBeInTheDocument()
  })
})
