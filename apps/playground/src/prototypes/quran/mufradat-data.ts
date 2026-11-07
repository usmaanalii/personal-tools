import type { QuranWord, MufradatCompleteResponse } from '@scratch-pages/api-contracts/quran'
import { getMufradatEntry } from './quran-api'

export type MufradatResult = MufradatCompleteResponse

export function createMufradatReader() {
  const cache = new Map<string, MufradatResult>()
  return async (word: QuranWord, signal: AbortSignal): Promise<MufradatResult> => {
    if (word.grammar?.status !== 'available') return { status: 'missing' }
    const queries = word.grammar.segments.filter(segment => segment.kind === 'stem' && (segment.root || segment.lemma))
      .map(segment => ({ ...(segment.root ? { root: segment.root } : {}), ...(segment.lemma ? { lemma: segment.lemma } : {}) }))
    const unique = [...new Map(queries.map(query => [JSON.stringify(query), query])).entries()]
    const results = await Promise.all(unique.map(async ([key, query]) => {
      const result = cache.get(key) ?? await getMufradatEntry(query, signal)
      signal.throwIfAborted()
      cache.set(key, result)
      return result
    }))
    const ids = [...new Set(results.flatMap(result => result.status === 'matched' ? [result.entry.id] : result.status === 'ambiguous' ? result.ids : []))]
    if (results.some(result => result.status === 'ambiguous')) return { status: 'ambiguous', ids }
    const entries = [...new Map(results.flatMap(result => result.status === 'matched' ? [result.entry] : result.status === 'multiple' ? result.entries : []).map(entry => [entry.id, entry])).values()]
    if (entries.length > 1) return { status: 'multiple', entries }
    return results.find(result => result.status === 'matched') ?? { status: 'missing' }
  }
}
