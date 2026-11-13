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
const indexBudgetMs = 200

export function cacheIndex<T>(load: () => Promise<T>): (signal?: AbortSignal) => Promise<T> {
  async function loadWithDeadline() {
    const expiresAt = Date.now() + indexBudgetMs
    const timeout = new Error('Dictionary index deadline exceeded')
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(timeout), indexBudgetMs)
    })
    try {
      const index = await Promise.race([load(), deadline])
      if (Date.now() >= expiresAt) throw timeout
      return index
    } finally {
      clearTimeout(timer)
    }
  }

  let pending: Promise<T> | undefined
  return async (signal) => {
    signal?.throwIfAborted()
    pending ??= loadWithDeadline().catch(error => {
      pending = undefined
      throw error
    })
    if (!signal) return pending

    const { promise: cancelled, reject } = Promise.withResolvers<never>()
    const cancel = () => reject(signal.reason)
    signal.addEventListener('abort', cancel, { once: true })
    try {
      return await Promise.race([pending, cancelled])
    } finally {
      signal.removeEventListener('abort', cancel)
    }
  }
}
