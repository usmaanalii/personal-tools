import type { QuranWord, LaneResponse } from '@scratch-pages/api-contracts/quran'
import { getLaneEntries } from './quran-api'

export type { LaneEntry } from '@scratch-pages/api-contracts/quran'
export type LaneResult = LaneResponse['entries'][number]

export function createLaneReader() {
  const cache = new Map<string, LaneResponse['entries']>()
  return async (word: QuranWord, signal: AbortSignal): Promise<LaneResult[]> => {
    if (word.grammar?.status !== 'available') return []
    const queries = word.grammar.segments.filter(segment => segment.kind === 'stem' && (segment.root || segment.lemma))
      .map(segment => ({ ...(segment.root ? { root: segment.root } : {}), ...(segment.lemma ? { lemma: segment.lemma } : {}) }))
    const unique = [...new Map(queries.map(query => [JSON.stringify(query), query])).entries()]
    const results = await Promise.all(unique.map(async ([key, query]) => {
      const entries = cache.get(key) ?? (await getLaneEntries(query, signal)).entries
      if (entries.every(item => item.entry)) cache.set(key, entries)
      return entries
    }))
    return [...new Map(results.flat().map(item => [item.id, item])).values()]
  }
}
