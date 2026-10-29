import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderReader() {
  render(<App />)
}

describe('Quran reader', () => {
  it('opens on Al-Fatihah and shows its first verse', () => {
    renderReader()

    expect(screen.getByRole('heading', { name: 'Al-Fātiḥah' })).toBeInTheDocument()
    expect(screen.getByText('In the name of Allah—the Most Compassionate, Most Merciful.')).toBeInTheDocument()
  })
})
