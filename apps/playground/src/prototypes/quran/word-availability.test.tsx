import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import WordAvailabilityPreview from './word-availability-preview'

it('shows three binary source circles for each word and explains them in text', async () => {
  const user = userEvent.setup()
  render(<WordAvailabilityPreview />)

  const grammarOnly = screen.getByRole('button', { name: /2:4:11$/ })
  expect(grammarOnly).toHaveTextContent('●○○')
  expect(grammarOnly).toHaveAccessibleDescription('Corpus: Available. Lane: Unavailable. Mufradāt: Unavailable.')

  for (const reference of ['2:4:10', '2:1:1']) {
    const word = screen.getByRole('button', { name: new RegExp(`${reference}$`) })
    expect(word).toHaveTextContent('○○○')
    expect(word).toHaveAccessibleDescription('Corpus: Unavailable. Lane: Unavailable. Mufradāt: Unavailable.')
  }

  const mufradatOnlyWithCorpus = screen.getByRole('button', { name: /2:4:5$/ })
  expect(mufradatOnlyWithCorpus).toHaveTextContent('●○●')
  expect(screen.getByRole('button', { name: /2:4:3$/ })).toHaveTextContent('●●○')

  const multiple = screen.getByRole('button', { name: /2:27:6$/ })
  expect(multiple).toHaveTextContent('●●●')
  await user.click(multiple)
  expect(screen.getByRole('status')).toHaveTextContent('Corpus: Available. Lane: Available. Mufradāt: Available.')
  expect(screen.getByText('Left to right: Corpus, Lane, Mufradāt.')).toBeVisible()
  expect(screen.getByText('● Available')).toBeVisible()
  expect(screen.getByText('○ Unavailable')).toBeVisible()
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
})
