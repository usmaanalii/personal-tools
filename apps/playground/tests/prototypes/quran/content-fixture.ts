import type { Page } from '@playwright/test'
import { chapters, alFatihah } from '../../../src/prototypes/quran/quran-fixtures.test-data'

// Browser UI fixture: this does not exercise the hosted Edge Function or Quran API.
export async function mockQuranContent(page: Page) {
  await page.route('**/functions/v1/quran/v2/chapters', route => route.fulfill({ json: { chapters } }))
  await page.route('**/functions/v1/quran/v2/verses?*', route => route.fulfill({ json: { verses: alFatihah.map(verse => ({ number: verse.number, arabic: verse.arabic, translationHtml: verse.translation,
    ...(verse.number === 1 ? { words: [
      { chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ', meaning: 'In (the) name', transliteration: "bis'mi" },
      { chapter: 1, verse: 1, position: 2, arabic: 'اللَّهِ', meaning: 'of Allah', transliteration: 'l-lahi' },
      { chapter: 1, verse: 1, position: 3, arabic: 'الرَّحْمَٰنِ', meaning: 'the Most Gracious', transliteration: 'l-rahmani' },
      { chapter: 1, verse: 1, position: 4, arabic: 'الرَّحِيمِ', meaning: 'the Most Merciful', transliteration: 'l-rahimi' },
    ] } : {}),
  })), translationName: 'Dr. Mustafa Khattab, The Clear Quran', nextPage: null } }))
}
