import { useState } from 'react'
import type { QuranWord } from '@scratch-pages/api-contracts/quran'

/** Selection and neighbors use the verse's validated provider order. */
export function useWordSelection(words: QuranWord[] | undefined) {
  const [position, select] = useState<number | null>(null)
  const index = words?.findIndex(item => item.position === position) ?? -1
  const word = words?.[index]
  const previous = words?.[index - 1]
  const next = word ? words?.[index + 1] : undefined
  return {
    word, index, previous, next, select,
    clear: () => select(null),
    movePrevious: () => { if (previous) select(previous.position) },
    moveNext: () => { if (next) select(next.position) },
  }
}
