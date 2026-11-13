import type { LaneRequest, VersesResponse } from '../../../packages/api-contracts/src/quran.ts'
import { dictionaryLookups } from '../../../packages/api-contracts/src/dictionary-lookups.ts'
import type { LoadDictionaryIndex } from './dictionary-index.ts'

type DictionaryLookup = Awaited<ReturnType<LoadDictionaryIndex>>
type DictionarySource = { readonly loadIndex: LoadDictionaryIndex }

async function loadIndex(source?: DictionarySource) {
  try {
    return await source?.loadIndex()
  } catch {
    return 'temporarily_unavailable' as const
  }
}

function status(queries: LaneRequest[] | undefined, lookup: DictionaryLookup | 'temporarily_unavailable' | undefined) {
  if (lookup === 'temporarily_unavailable') return lookup
  if (!lookup || !queries) return 'unknown'
  const count = new Set(queries.flatMap(query => lookup(query))).size
  if (count > 1) return 'multiple'
  return count === 1 ? 'indexed' : 'missing'
}

export async function enrichDictionaryAvailability(page: VersesResponse, laneSource?: DictionarySource, mufradatSource?: DictionarySource): Promise<VersesResponse> {
  if (!page.verses.some(verse => verse.words?.some(word => word.availability?.corpus === 'lexical'))) return page
  const [lane, mufradat] = await Promise.all([loadIndex(laneSource), loadIndex(mufradatSource)])
  return {
    ...page,
    verses: page.verses.map(verse => ({
      ...verse,
      ...(verse.words && { words: verse.words.map(word => {
        if (word.availability?.corpus !== 'lexical') return word
        const queries = word.grammar?.status === 'available' ? dictionaryLookups(word.grammar) : undefined
        return { ...word, availability: { ...word.availability, lane: status(queries, lane), mufradat: status(queries, mufradat) } }
      }) }),
    })),
  }
}
