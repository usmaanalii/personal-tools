import type { Page } from '@playwright/test'
import { chapters, alFatihah } from '../src/prototypes/quran/quran-fixtures.test-data'

// Browser UI fixture: this does not exercise the hosted Edge Function or Quran API.
export async function mockQuranContent(page: Page) {
  await page.route('**/functions/v1/quran/chapters', route => route.fulfill({ json: { chapters: chapters.map(chapter => ({ id: chapter.id, name_simple: chapter.name, name_arabic: chapter.arabic, translated_name: { name: chapter.meaning }, verses_count: chapter.verses, revelation_place: chapter.place === 'Meccan' ? 'makkah' : 'madinah' })) } }))
  await page.route('**/functions/v1/quran/verses?*', route => route.fulfill({ json: { verses: alFatihah.map(verse => ({ verse_number: verse.number, text_uthmani: verse.arabic, translations: [{ resource_id: 131, text: verse.translation }] })), pagination: { next_page: null } } }))
}
