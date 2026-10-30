export type Chapter = { id: number; name: string; arabic: string; meaning: string; verses: number; place: 'Meccan' | 'Medinan' }
export type Ayah = { number: number; arabic: string; translation: string }
export type VersePage = { verses: Ayah[]; translationName: string; nextPage: number | null }

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Quran content has an unexpected format.')
  return Object.fromEntries(Object.entries(value))
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Quran content has an unexpected format.')
  return value
}
function integer(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) throw new Error('Quran content has an unexpected format.')
  return value
}
async function getContent(path: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('The Quran reader is not configured yet.')
  const response = await fetch(`${url}/functions/v1/quran/${path}`, { signal, headers: { apikey: key, Accept: 'application/json' } })
  if (!response.ok) throw new Error(response.status === 503 ? 'Quran content is not configured yet.' : 'Quran content is temporarily unavailable. Please try again.')
  return object(await response.json())
}
export async function getChapters(signal: AbortSignal): Promise<[Chapter, ...Chapter[]]> {
  const payload = await getContent('chapters', signal)
  if (!Array.isArray(payload.chapters)) throw new Error('Quran content has an unexpected format.')
  const chapters = payload.chapters.map((value: unknown): Chapter => {
    const item = object(value)
    if (item.revelation_place !== 'makkah' && item.revelation_place !== 'madinah') throw new Error('Quran content has an unexpected format.')
    return { id: integer(item.id, 114), name: text(item.name_simple), arabic: text(item.name_arabic), meaning: text(object(item.translated_name).name), verses: integer(item.verses_count, 286), place: item.revelation_place === 'makkah' ? 'Meccan' : 'Medinan' }
  })
  const [first, ...rest] = chapters
  if (!first || new Set(chapters.map(chapter => chapter.id)).size !== chapters.length) throw new Error('No chapters are available.')
  return [first, ...rest]
}
export async function getVerses(chapter: number, page: number, signal: AbortSignal): Promise<VersePage> {
  const payload = await getContent(`verses?chapter=${chapter}&page=${page}`, signal)
  if (!Array.isArray(payload.verses) || payload.verses.length === 0 || payload.verses.length > 20) throw new Error('No verses are available on this page.')
  const rows = payload.verses.map(object)
  const firstTranslations = rows[0]?.translations
  if (!Array.isArray(firstTranslations)) throw new Error('The translation is unavailable.')
  const resource = firstTranslations.map(object).find(item => item.resource_id === 131 || item.resource_id === 85)
  if (!resource) throw new Error('The translation is unavailable.')
  const translationId = resource.resource_id
  const translationName = translationId === 85 ? 'M.A.S. Abdel Haleem' : 'Dr. Mustafa Khattab, The Clear Quran'
  const verses = rows.map((item): Ayah => {
    if (!Array.isArray(item.translations)) throw new Error('The translation is unavailable.')
    const translation = item.translations.map(object).find(item => item.resource_id === translationId)
    if (!translation) throw new Error('The translation is unavailable.')
    // Extract inert text: API translations may contain HTML footnotes and formatting.
    const document = new DOMParser().parseFromString(text(translation.text), 'text/html')
    document.querySelectorAll('script, style, sup').forEach(node => { node.remove() })
    return { number: integer(item.verse_number, 286), arabic: text(item.text_uthmani), translation: text(document.body.textContent) }
  })
  const next = object(payload.pagination).next_page
  const nextPage = next === null ? null : integer(next, 15)
  if (nextPage !== null && nextPage !== page + 1) throw new Error('Quran pagination has an unexpected format.')
  return { verses, nextPage, translationName }
}
