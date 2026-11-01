import type { QuranWord } from '@scratch-pages/api-contracts/quran'

export function WordContent({ word, chapterName }: { word: QuranWord; chapterName: string }) {
  return (
    <div className="word-details" aria-live="polite" aria-atomic="true">
      <p className="word-reference">{chapterName} · {word.chapter}:{word.verse}</p>
      <p className="word-arabic" lang="ar" dir="rtl" translate="no">{word.arabic}</p>
      <p className="word-transliteration">{word.transliteration ?? 'Transliteration unavailable'}</p>
      <p className="word-meaning">{word.meaning ?? 'Meaning unavailable for this word.'}</p>
      <p className="word-credit">English word data · Quran Foundation</p>
    </div>
  )
}
