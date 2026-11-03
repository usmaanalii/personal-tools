import type { Page } from '@playwright/test'
import type { VersesResponse } from '@scratch-pages/api-contracts/quran'
import { chapters, alFatihah, buildWord } from '../../../src/prototypes/quran/quran-fixtures.test-data'

// Browser UI fixture: this does not exercise the hosted Edge Function or Quran API.
export async function mockQuranContent(page: Page, options: { meaning?: string } = {}) {
  await page.route('**/functions/v1/quran/v2/chapters', route => route.fulfill({ json: { chapters } }))
  await page.route('**/functions/v1/quran/v2/verses?*', route => {
    const params = new URL(route.request().url()).searchParams
    if (params.get('chapter') !== '1' || params.get('page') !== '1') {
      return route.fulfill({ status: 404, json: { error: 'No fixture for this chapter and page' } })
    }
    const response: VersesResponse = {
      verses: alFatihah.map(verse => ({ number: verse.number, arabic: verse.arabic, translationHtml: verse.translation,
        ...(verse.number === 1 ? { words: [
          buildWord(options.meaning ? { meaning: options.meaning } : {}),
          buildWord({ position: 2, arabic: 'اللَّهِ', meaning: 'of Allah', transliteration: 'l-lahi' }),
          buildWord({ position: 3, arabic: 'الرَّحْمَٰنِ', meaning: 'the Most Gracious', transliteration: 'l-rahmani' }),
          buildWord({ position: 4, arabic: 'الرَّحِيمِ', meaning: 'the Most Merciful', transliteration: 'l-rahimi' }),
        ] } : {}),
      })), translationName: 'Dr. Mustafa Khattab, The Clear Quran', nextPage: null,
    }
    return route.fulfill({ json: response })
  })
}
