import type { QuranWord, MufradatResponse } from '@scratch-pages/api-contracts/quran'
import { getMufradatEntry } from './quran-api'

export function createMufradatReader() {
  const cache = new Map<string, MufradatResponse>()
  return async (word: QuranWord, signal: AbortSignal): Promise<MufradatResponse> => {
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
    if (ids.length > 1) return { status: 'ambiguous', ids }
    return results.find(result => result.status === 'matched') ?? { status: 'missing' }
  }
}
