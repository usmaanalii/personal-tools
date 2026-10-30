import { ChaptersResponseSchema, VersesRequestSchema, VersesResponseSchema, type Chapter, type VersesResponse } from '@scratch-pages/api-contracts/quran'

export type { Chapter }
export type Ayah = { number: number; arabic: string; translation: string }
export type VersePage = Omit<VersesResponse, 'verses'> & { verses: Ayah[] }

const formatError = 'Quran content has an unexpected format.'

async function getContent(path: string, signal: AbortSignal): Promise<unknown> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('The Quran reader is not configured yet.')
  const response = await fetch(`${url}/functions/v1/quran/v2/${path}`, { signal, headers: { apikey: key, Accept: 'application/json' } })
  if (!response.ok) throw new Error(response.status === 503 ? 'Quran content is not configured yet.' : 'Quran content is temporarily unavailable. Please try again.')
  return response.json()
}

export async function getChapters(signal: AbortSignal): Promise<[Chapter, ...Chapter[]]> {
  const result = ChaptersResponseSchema.safeParse(await getContent('chapters', signal))
  if (!result.success) throw new Error(formatError)
  const [first, ...rest] = result.data.chapters
  if (!first) throw new Error('No chapters are available.')
  return [first, ...rest]
}

export async function getVerses(chapter: number, page: number, signal: AbortSignal): Promise<VersePage> {
  const input = VersesRequestSchema.parse({ chapter, page })
  const query = new URLSearchParams({ chapter: String(input.chapter), page: String(input.page) })
  const result = VersesResponseSchema.safeParse(await getContent(`verses?${query}`, signal))
  if (!result.success) throw new Error(formatError)
  const { nextPage, translationName } = result.data
  if (nextPage !== null && nextPage !== page + 1) throw new Error('Quran pagination has an unexpected format.')
  const verses = result.data.verses.map((verse): Ayah => {
    // The contract explicitly carries untrusted HTML. Render only inert text.
    const document = new DOMParser().parseFromString(verse.translationHtml, 'text/html')
    document.querySelectorAll('script, style, sup').forEach(node => { node.remove() })
    const translation = document.body.textContent?.trim()
    if (!translation) throw new Error('The translation is unavailable.')
    return { number: verse.number, arabic: verse.arabic, translation }
  })
  return { verses, nextPage, translationName }
}
