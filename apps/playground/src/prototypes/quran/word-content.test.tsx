import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { buildWord } from './quran-fixtures.test-data'
import { WordContent } from './word-content'

it("shows a word's meaning with its pronunciation and source", () => {
  render(<WordContent word={buildWord()} chapterName="Al-Fātiḥah"/>)
  const arabic = screen.getByText('بِسْمِ')
  expect(arabic).toBeVisible()
  expect(arabic).toHaveAttribute('lang', 'ar')
  expect(arabic).toHaveAttribute('dir', 'rtl')
  expect(arabic).toHaveAttribute('translate', 'no')
  expect(screen.getByText('Al-Fātiḥah · 1:1')).toBeVisible()
  expect(screen.getByText('In (the) name')).toBeVisible()
  expect(screen.getByText("bis'mi")).toBeVisible()
  expect(screen.getByText('English word data · Quran Foundation')).toBeVisible()
})
