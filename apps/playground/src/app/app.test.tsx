import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './app'

function renderAtPath(path: string) {
  window.history.pushState({}, '', path)
  render(<App />)
}

afterEach(() => window.history.pushState({}, '', '/'))

describe('Playground navigation', () => {
  it('offers separate destinations for the Quran reader and Supabase demo', () => {
    renderAtPath('/')

    expect(screen.getByRole('heading', { name: 'Playground' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Quran reader/i }).getAttribute('href')).toMatch(/quran\/$/)
    expect(screen.getByRole('link', { name: /Supabase API demo/i }).getAttribute('href')).toMatch(/supabase\/$/)
  })

  it('shows the Quran reader when the current path is /quran/', async () => {
    renderAtPath('/quran/')

    expect(await screen.findByRole('heading', { name: 'Al-Fātiḥah' })).toBeInTheDocument()
  })
})
