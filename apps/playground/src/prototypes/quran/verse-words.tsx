import type { QuranWord } from '@scratch-pages/api-contracts/quran'
import type { Ayah } from './quran-api'
import { occurrenceKey } from './use-word-selection'
import { describeWordAvailability, WordAvailabilityCircles } from './word-availability'

export function VerseWords({ verse, selectedWord, onSelectWord, className = '' }: {
  readonly verse: Ayah
  readonly selectedWord: QuranWord | undefined
  readonly onSelectWord: (word: QuranWord) => void
  readonly className?: string
}) {
  return <p className={`arabic-text ${className}`} translate="no" lang="ar" dir="rtl">
    {verse.words ? verse.words.map(item => {
      const reference = occurrenceKey(item)
      const descriptionId = `reader-word-sources-${reference}`
      return <span key={item.position}>
        <button type="button" className="quran-word quran-word-with-availability relative" id={`reader-word-${reference}`}
          aria-label={`${item.arabic} · ${reference}`} aria-describedby={descriptionId} aria-haspopup="dialog"
          aria-pressed={selectedWord !== undefined && occurrenceKey(selectedWord) === reference}
          onClick={() => onSelectWord(item)}>{item.arabic}<WordAvailabilityCircles availability={item.availability}/></button>{' '}
        <span id={descriptionId} lang="en" hidden>{describeWordAvailability(item.availability)}</span>
      </span>
    }) : verse.arabic}
    <span className="ayah-mark">۝{verse.number}</span>
  </p>
}
