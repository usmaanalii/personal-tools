import type { QuranWord, VersesResponse } from '../../../packages/api-contracts/src/quran.ts'
import type { LoadDictionaryIndex } from './dictionary-index.ts'

type DictionaryLookup = Awaited<ReturnType<LoadDictionaryIndex>>

async function loadIndex(load?: LoadDictionaryIndex) {
  try {
    return await load?.()
  } catch {
    return 'temporarily_unavailable' as const
  }
}

function status(word: QuranWord, lookup: DictionaryLookup | 'temporarily_unavailable' | undefined) {
  if (lookup === 'temporarily_unavailable') return lookup
  if (!lookup || word.grammar?.status !== 'available') return 'unknown'
  const ids = word.grammar.segments.flatMap(segment => segment.kind === 'stem' && (segment.root || segment.lemma)
    ? lookup({ root: segment.root || undefined, lemma: segment.lemma || undefined })
    : [])
  const count = new Set(ids).size
  if (count > 1) return 'multiple'
  return count === 1 ? 'indexed' : 'missing'
}

export async function enrichDictionaryAvailability(page: VersesResponse, loadLane?: LoadDictionaryIndex, loadMufradat?: LoadDictionaryIndex): Promise<VersesResponse> {
  if (!page.verses.some(verse => verse.words?.some(word => word.availability?.corpus === 'lexical'))) return page
  const [lane, mufradat] = await Promise.all([loadIndex(loadLane), loadIndex(loadMufradat)])
  return {
    ...page,
    verses: page.verses.map(verse => ({
      ...verse,
      ...(verse.words && { words: verse.words.map(word => {
        if (word.availability?.corpus !== 'lexical') return word
        return { ...word, availability: { ...word.availability, lane: status(word, lane), mufradat: status(word, mufradat) } }
      }) }),
    })),
  }
}
