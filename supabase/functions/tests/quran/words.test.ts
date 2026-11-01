import { expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../server'
import { createQuranHandler } from '../../quran/handler'

const origin = 'https://usmaanalii.github.io'
function word(position = 1) {
  return { position, text_uthmani: 'بِسْمِ', char_type_name: 'word', translation: { text: 'In (the) name', language_name: 'english' }, transliteration: { text: "bis'mi", language_name: 'english' } }
}
function provider(words: unknown = [word(), { position: 2, text_uthmani: '١', char_type_name: 'end' }]) {
  return { verses: [{ verse_number: 1, text_uthmani: 'بِسْمِ', translations: [{ resource_id: 85, text: 'In the name' }], words }], pagination: { next_page: null } }
}
async function read(payload: unknown, legacy = false) {
  server.use(
    http.post('https://prelive-oauth2.quran.foundation/oauth2/token', () => HttpResponse.json({ access_token: 'test-token', expires_in: 3600 })),
    http.get('https://apis-prelive.quran.foundation/content/api/v4/verses/by_chapter/1', ({ request }) => {
      const params = new URL(request.url).searchParams
      if (!legacy) {
        expect(params.get('words')).toBe('true')
        expect(params.get('word_fields')).toBe('text_uthmani')
        expect(params.get('language')).toBe('en')
      }
      expect(params.get('translations')).toBe('85')
      return HttpResponse.json(payload)
    }),
  )
  const handler = createQuranHandler({ clientId: 'test-client', clientSecret: 'test-secret', environment: 'prelive', origins: [origin] })
  return handler(new Request(`https://example.com/functions/v1/quran/${legacy ? '' : 'v2/'}verses?chapter=1`, { headers: { Origin: origin } }))
}

it('publishes validated words with occurrence identity and excludes verse-end markers', async () => {
  const response = await read(provider())
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body).toMatchObject({ verses: [{ number: 1, words: [{ chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ', meaning: 'In (the) name', transliteration: "bis'mi" }] }] })
  expect(body.verses[0].words).toHaveLength(1)
})

it.each([null, [], [{ ...word(), position: 0 }], [word(), word()], [word(2)], [{ ...word(), text_uthmani: '' }], [{ ...word(), char_type_name: 'unknown' }]])('keeps whole-verse content usable when word data is unusable, case %#', async words => {
  const response = await read(provider(words))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ verses: [{ number: 1, arabic: 'بِسْمِ', translationHtml: 'In the name' }], translationName: 'M.A.S. Abdel Haleem', nextPage: null })
})

it('retains words with missing glosses and transliteration without inventing English meanings', async () => {
  const response = await read(provider([{ ...word(), translation: { text: 'اسم', language_name: 'arabic' }, transliteration: null }]))
  expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: null, transliteration: null }] }] })
})

it('preserves the legacy provider response including its original word fields', async () => {
  const payload = provider()
  expect(await (await read(payload, true)).json()).toEqual(payload)
})

it('keeps repeated words as distinct occurrences ordered by provider position', async () => {
  const body = await (await read(provider([word(2), word(1)]))).json()
  expect(body.verses[0].words.map((item: { position: number }) => item.position)).toEqual([1, 2])
})
