import type { LaneMatch, LaneRequest } from '../../../packages/api-contracts/src/quran.ts'

type Lookup = { roots: Record<string, string[]>; lemmas: Record<string, string[]> }

export function selectEntries(query: LaneRequest, lookup: Lookup): { ids: string[]; match?: LaneMatch } {
  if (query.lemma && Object.hasOwn(lookup.lemmas, query.lemma)) {
    return { ids: lookup.lemmas[query.lemma], match: { kind: 'lemma', key: query.lemma } }
  }
  if (query.root && Object.hasOwn(lookup.roots, query.root)) {
    return { ids: lookup.roots[query.root], match: { kind: 'root', key: query.root } }
  }
  return { ids: [] }
}

export type LoadDictionaryIndex = () => Promise<(query: LaneRequest) => readonly string[]>

export function cacheIndex<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined
  return () => {
    pending ??= load().catch(error => {
      pending = undefined
      throw error
    })
    return pending
  }
}
