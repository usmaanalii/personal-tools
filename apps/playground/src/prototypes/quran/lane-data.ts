import type { QuranWord, LaneResponse } from '@scratch-pages/api-contracts/quran'
import { dictionaryLookups } from '@scratch-pages/api-contracts/dictionary-lookups'
import { getLaneEntries } from './quran-api'

export type { LaneEntry } from '@scratch-pages/api-contracts/quran'
export type LaneResult = LaneResponse['entries'][number]

export function createLaneReader() {
  const cache = new Map<string, LaneResponse['entries']>()
  return async (word: QuranWord, signal: AbortSignal): Promise<LaneResult[]> => {
    const results = await Promise.all(dictionaryLookups(word.grammar).map(async query => {
      const key = JSON.stringify(query)
      const entries = cache.get(key) ?? (await getLaneEntries(query, signal)).entries
      if (entries.every(item => item.entry)) cache.set(key, entries)
      return entries
    }))
    return [...new Map(results.flat().map(item => [item.id, item])).values()]
  }
}
