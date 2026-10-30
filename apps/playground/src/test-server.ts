import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { chapters, alFatihah } from './prototypes/quran/quran-fixtures.test-data'
import { getSupabaseConfig } from './prototypes/supabase/config'

const { supabaseUrl } = getSupabaseConfig()
export const quranEndpoint = `${supabaseUrl}/functions/v1/quran/v2`
export const helloEndpoint = `${supabaseUrl}/functions/v1/hello`

export const server = setupServer(
  http.get(`${quranEndpoint}/chapters`, () => HttpResponse.json({ chapters })),
  http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const chapter = new URL(request.url).searchParams.get('chapter')
    const verses = chapter === '1' ? alFatihah : [{ number: 1, arabic: 'نص للاختبار', translation: `Test translation for chapter ${chapter}.` }]
    return HttpResponse.json({ verses: verses.map(verse => ({ number: verse.number, arabic: verse.arabic, translationHtml: verse.translation })), translationName: 'Dr. Mustafa Khattab, The Clear Quran', nextPage: null })
  }),
  http.get(helloEndpoint, () =>
    HttpResponse.json({ message: 'Hello from Supabase!', ok: true }),
  ),
)
