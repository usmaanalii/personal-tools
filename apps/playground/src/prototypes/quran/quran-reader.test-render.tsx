import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../app/app'

export async function renderReader() {
  const user = userEvent.setup()
  window.history.pushState({}, '', '/quran/')
  render(<App />)
  await screen.findByRole('heading', { name: 'Al-Fātiḥah' })
  await screen.findByRole('button', { name: 'Bookmark verse 1' })
  return { user }
}
