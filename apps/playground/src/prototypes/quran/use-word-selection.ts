import { useEffect, useRef, useState } from 'react'
import { VERSES_PER_PAGE, type QuranWord } from '@scratch-pages/api-contracts/quran'
import { getVerses, type Ayah, type VersePage } from './quran-api'

export function occurrenceKey(word: QuranWord) {
  return `${word.chapter}:${word.verse}:${word.position}`
}

type Direction = -1 | 1
type Transition =
  | { readonly status: 'loading'; readonly direction: Direction; readonly retrying: boolean }
  | { readonly status: 'failed'; readonly direction: Direction }
  | { readonly status: 'unavailable'; readonly verse: number }

export function useWordSelection({ verses, verseCount, page, commitPage }: {
  readonly verses: readonly Ayah[]
  readonly verseCount: number
  readonly page: number
  readonly commitPage: (page: number, data: VersePage) => void
}) {
  const [selected, setSelected] = useState<QuranWord | null>(null)
  const [transition, setTransition] = useState<Transition | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const words = selected ? verses.find(verse => verse.number === selected.verse)?.words : undefined
  const index = words?.findIndex(word => selected && occurrenceKey(word) === occurrenceKey(selected)) ?? -1
  const word = words?.[index]
  const move = async (direction: Direction, onResolved?: () => void) => {
    if (!word || request.current) return
    setTransition(null)
    const adjacent = words?.[index + direction]
    if (adjacent) {
      setSelected(adjacent)
      return
    }
    const verseNumber = word.verse + direction
    if (verseNumber < 1 || verseNumber > verseCount) return
    const destinationPage = Math.ceil(verseNumber / VERSES_PER_PAGE)
    const destinationWord = (pageVerses: readonly Ayah[]) =>
      pageVerses.find(verse => verse.number === verseNumber)?.words?.at(direction === 1 ? 0 : -1)
    if (destinationPage === page) {
      const destination = destinationWord(verses)
      if (destination) setSelected(destination)
      else setTransition({ status: 'unavailable', verse: verseNumber })
      return
    }
    const controller = new AbortController()
    request.current = controller
    setTransition({ status: 'loading', direction, retrying: Boolean(onResolved) })
    try {
      const data = await getVerses(word.chapter, destinationPage, controller.signal)
      if (controller.signal.aborted) return
      const destination = destinationWord(data.verses)
      onResolved?.()
      if (!destination) {
        setTransition({ status: 'unavailable', verse: verseNumber })
        return
      }
      commitPage(destinationPage, data)
      setSelected(destination)
      setTransition(null)
    } catch {
      if (!controller.signal.aborted) setTransition({ status: 'failed', direction })
    } finally {
      if (request.current === controller) {
        request.current = null
      }
    }
  }
  return {
    word, index, count: words?.length, transition, select: setSelected,
    previous: word && (index > 0 || word.verse > 1),
    next: word && (Boolean(words?.[index + 1]) || word.verse < verseCount),
    clear: () => {
      request.current?.abort()
      request.current = null
      setTransition(null)
      setSelected(null)
    },
    movePrevious: () => move(-1),
    moveNext: () => move(1),
    retry: (onResolved: () => void) => {
      if (transition?.status === 'failed') void move(transition.direction, onResolved)
    },
  }
}

export type WordSelection = ReturnType<typeof useWordSelection>
