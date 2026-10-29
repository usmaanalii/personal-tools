import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../../app/app'

function renderReader() {
  const user = userEvent.setup()
  window.history.pushState({}, '', '/quran/')
  render(<App />)
  return { user }
}

afterEach(() => window.history.pushState({}, '', '/'))

describe('Quran reader bookmarks', () => {
  it('shows a verse by its chapter and number after saving it', async () => {
    const { user } = renderReader()

    await user.click(screen.getByRole('button', { name: 'Bookmark verse 1' }))
    await user.click(screen.getByRole('button', { name: /My bookmarks/ }))

    expect(screen.getByRole('button', { name: /Al-Fātiḥah 1:1/ })).toBeInTheDocument()
  })

  it('announces when a verse bookmark is saved', async () => {
    const { user } = renderReader()
    const bookmark = screen.getByRole('button', { name: 'Bookmark verse 1' })

    expect(bookmark).toHaveAttribute('aria-pressed', 'false')
    await user.click(bookmark)
    expect(bookmark).toHaveAttribute('aria-pressed', 'true')
  })
})
