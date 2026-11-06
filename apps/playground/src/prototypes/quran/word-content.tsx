import type { QuranWord } from '@scratch-pages/api-contracts/quran'

export function WordContent({ word, chapterName }: { word: QuranWord; chapterName: string }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: This groups live word text, not form controls.
    <div role="group" aria-label="Word summary" aria-live="polite" aria-atomic="true" className="flex min-w-0 flex-1 items-center justify-between gap-3 text-sm">
      <p className="m-0 min-w-0 text-ui-muted wrap-anywhere">{chapterName} · Verse {word.verse}</p>
      <div className="min-w-0 text-right">
        <p className="m-0 [font:500_28px/1.5_'Noto_Naskh_Arabic',serif]" lang="ar" dir="rtl" translate="no">{word.arabic}</p>
        <p className="m-0 wrap-anywhere">{word.transliteration ?? 'Transliteration unavailable'}</p>
      </div>
    </div>
  )
}
