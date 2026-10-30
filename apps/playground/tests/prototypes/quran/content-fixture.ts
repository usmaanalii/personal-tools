import type { Page } from '@playwright/test'
import { chapters, alFatihah } from '../../../src/prototypes/quran/quran-fixtures.test-data'

// Browser UI fixture: this does not exercise the hosted Edge Function or Quran API.
export async function mockQuranContent(page: Page) {
  await page.route('**/functions/v1/quran/v2/chapters', route => route.fulfill({ json: { chapters } }))
  await page.route('**/functions/v1/quran/v2/verses?*', route => route.fulfill({ json: { verses: alFatihah.map(verse => ({ number: verse.number, arabic: verse.arabic, translationHtml: verse.translation })), translationName: 'Dr. Mustafa Khattab, The Clear Quran', nextPage: null } }))
}
