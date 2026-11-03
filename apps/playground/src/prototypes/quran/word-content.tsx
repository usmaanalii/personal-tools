import type { QuranWord } from '@scratch-pages/api-contracts/quran'

export function WordContent({ word, chapterName }: { word: QuranWord; chapterName: string }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      <p className="my-5 mb-2 text-ui-muted">{chapterName} · {word.chapter}:{word.verse}</p>
      <p className="my-2 text-center [font:500_42px/1.9_'Noto_Naskh_Arabic',serif]" lang="ar" dir="rtl" translate="no">{word.arabic}</p>
      <p className="my-3 text-center">{word.transliteration ?? 'Transliteration unavailable'}</p>
      <p className="my-3 text-center text-xl font-semibold">{word.meaning ?? 'Meaning unavailable for this word.'}</p>
      <p className="my-6 text-base text-ui-muted">English word data · Quran Foundation</p>
    </div>
  )
}
