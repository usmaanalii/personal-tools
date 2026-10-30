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
  { chapters: [] },
  { chapters: [{ id: 1 }] },
  { chapters: [{ id: 1, name: 'Name', arabic: 'نص', meaning: 'Meaning', verses: 7, place: 'Unknown' }] },
])('rejects malformed chapter responses, case %#', async payload => {
  server.use(http.get('*/functions/v1/quran/v2/chapters', () => HttpResponse.json(payload)))
  await expect(getChapters(new AbortController().signal)).rejects.toThrow('Quran content has an unexpected format.')
})

it('uses server attribution and renders only inert translation text', async () => {
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
  { verses: [], translationName: 'Translator', nextPage: null },
  { verses: [{ number: 1, arabic: 'نص', translationHtml: 'Text' }], nextPage: null },
  { verses: [{ number: 1, arabic: 'نص', translationHtml: 'Text' }], translationName: 'Translator', nextPage: 16 },
])('rejects malformed verse responses, case %#', async payload => {
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
