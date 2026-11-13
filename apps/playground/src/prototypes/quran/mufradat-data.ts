import type { QuranWord, MufradatCompleteResponse } from '@scratch-pages/api-contracts/quran'
import { dictionaryLookups } from '@scratch-pages/api-contracts/dictionary-lookups'
import { getMufradatEntry } from './quran-api'

export type MufradatResult = MufradatCompleteResponse

export function createMufradatReader() {
  const cache = new Map<string, MufradatResult>()
  return async (word: QuranWord, signal: AbortSignal): Promise<MufradatResult> => {
    const results = await Promise.all(dictionaryLookups(word.grammar).map(async query => {
      const key = JSON.stringify(query)
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
