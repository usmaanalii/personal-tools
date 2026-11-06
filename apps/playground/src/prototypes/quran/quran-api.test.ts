import { expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test-server'
import { getChapters, getVerses } from './quran-api'

it('reads the owned chapter contract without depending on provider fields', async () => {
  const chapters = [{ id: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', meaning: 'The Opening', verses: 7, place: 'Meccan' }]
  server.use(http.get('*/functions/v1/quran/*', () => HttpResponse.json({ chapters, futureField: true })))
  expect(await getChapters(new AbortController().signal)).toEqual(chapters)
})


it.each([
  { reason: 'the chapter list is empty', payload: { chapters: [] } },
  { reason: 'chapter details are missing', payload: { chapters: [{ id: 1 }] } },
  { reason: 'a chapter has an unknown revelation place', payload: { chapters: [{ id: 1, name: 'Name', arabic: 'نص', meaning: 'Meaning', verses: 7, place: 'Unknown' }] } },
])('rejects the response when $reason', async ({ payload }) => {
  server.use(http.get('*/functions/v1/quran/v2/chapters', () => HttpResponse.json(payload)))
  await expect(getChapters(new AbortController().signal)).rejects.toThrow('Quran content has an unexpected format.')
})

it('returns the supplied translator attribution and inert translation text', async () => {
  server.use(http.get('*/functions/v1/quran/v2/verses', () => HttpResponse.json({
    verses: [{ number: 1, arabic: 'نص', translationHtml: 'Translation<sup>1</sup><script>unsafe()</script>' }],
    translationName: 'An independently selected translation', nextPage: null, futureField: true,
  })))
  expect(await getVerses(1, 1, new AbortController().signal)).toEqual({
    verses: [{ number: 1, arabic: 'نص', translation: 'Translation' }],
    translationName: 'An independently selected translation', nextPage: null,
  })
})

it.each([
  { reason: 'the verse list is empty', payload: { verses: [], translationName: 'Translator', nextPage: null } },
  { reason: 'translator attribution is missing', payload: { verses: [{ number: 1, arabic: 'نص', translationHtml: 'Text' }], nextPage: null } },
  { reason: 'the next page exceeds the supported page limit', payload: { verses: [{ number: 1, arabic: 'نص', translationHtml: 'Text' }], translationName: 'Translator', nextPage: 16 } },
])('rejects the response when $reason', async ({ payload }) => {
  server.use(http.get('*/functions/v1/quran/v2/verses', () => HttpResponse.json(payload)))
  await expect(getVerses(1, 1, new AbortController().signal)).rejects.toThrow('Quran content has an unexpected format.')
})

it('rejects nonsequential verse pagination', async () => {
  server.use(http.get('*/functions/v1/quran/v2/verses', () => HttpResponse.json({
    verses: [{ number: 1, arabic: 'نص', translationHtml: 'Text' }], translationName: 'Translator', nextPage: 3,
  })))
  await expect(getVerses(1, 1, new AbortController().signal)).rejects.toThrow('Quran pagination has an unexpected format.')
})

it('preserves request cancellation', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(getChapters(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
})

it('preserves valid word meanings when only their grammar response is malformed', async () => {
  server.use(http.get('*/functions/v1/quran/v2/verses', () => HttpResponse.json({
    verses: [{ number: 1, arabic: 'بِسْمِ', translationHtml: 'In the name', words: [
      { chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ', meaning: 'In (the) name', transliteration: null, grammar: { status: 'available', segments: [] } },
    ] }], translationName: 'Translator', nextPage: null,
  })))
  const page = await getVerses(1, 1, new AbortController().signal)
  expect(page.verses[0]?.words).toEqual([
    { chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ', meaning: 'In (the) name', transliteration: null, grammar: { status: 'temporarily_unavailable' } },
  ])
})

it.each([
  { reason: 'word data is null', words: null },
  { reason: 'the word list is empty', words: [] },
  { reason: 'word details are missing', words: [{ position: 1 }] },
  { reason: 'a word belongs to another chapter', words: [{ chapter: 2, verse: 1, position: 1, arabic: 'نص', meaning: null, transliteration: null }] },
  { reason: 'a word belongs to another verse', words: [{ chapter: 1, verse: 2, position: 1, arabic: 'نص', meaning: null, transliteration: null }] },
  { reason: 'word positions do not start at one', words: [{ chapter: 1, verse: 1, position: 2, arabic: 'نص', meaning: null, transliteration: null }] },
])('retains whole-verse reading when $reason', async ({ words }) => {
  server.use(http.get('*/functions/v1/quran/v2/verses', () => HttpResponse.json({
    verses: [{ number: 1, arabic: 'نص', translationHtml: 'Text', words }], translationName: 'Translator', nextPage: null,
  })))
  expect(await getVerses(1, 1, new AbortController().signal)).toEqual({ verses: [{ number: 1, arabic: 'نص', translation: 'Text' }], translationName: 'Translator', nextPage: null })
})
