import type { LaneRequest, WordGrammar } from './quran.ts'

export function dictionaryLookups(grammar: WordGrammar | undefined): LaneRequest[] {
  if (grammar?.status !== 'available') return []

  const lookups = new Map<string, LaneRequest>()
  for (const { kind, root, lemma } of grammar.segments) {
    if (kind !== 'stem' || (!root && !lemma)) continue
    const query = { ...(root ? { root } : {}), ...(lemma ? { lemma } : {}) }
    lookups.set(JSON.stringify(query), query)
  }
  return [...lookups.values()]
}
