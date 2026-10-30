import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { chapters, alFatihah } from './prototypes/quran/quran-fixtures.test-data'
import { getSupabaseConfig } from './prototypes/supabase/config'

const { supabaseUrl } = getSupabaseConfig()
export const quranEndpoint = `${supabaseUrl}/functions/v1/quran`
export const helloEndpoint = `${supabaseUrl}/functions/v1/hello`

export const server = setupServer(
  http.get(`${quranEndpoint}/chapters`, () => HttpResponse.json({ chapters: chapters.map(chapter => ({ id: chapter.id, name_simple: chapter.name, name_arabic: chapter.arabic, translated_name: { name: chapter.meaning }, verses_count: chapter.verses, revelation_place: chapter.place === 'Meccan' ? 'makkah' : 'madinah' })) })),
  http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const chapter = new URL(request.url).searchParams.get('chapter')
    const verses = chapter === '1' ? alFatihah : [{ number: 1, arabic: 'نص للاختبار', translation: `Test translation for chapter ${chapter}.` }]
    return HttpResponse.json({ verses: verses.map(verse => ({ verse_number: verse.number, text_uthmani: verse.arabic, translations: [{ resource_id: 131, text: verse.translation }] })), pagination: { next_page: null } })
  }),
  http.get(helloEndpoint, () =>
    HttpResponse.json({ message: 'Hello from Supabase!', ok: true }),
  ),
)
