import { WordGrammarSchema, type QuranWord, type VersesResponse, type WordGrammar } from '../../../packages/api-contracts/src/quran.ts'
import { dictionaryLookups } from '../../../packages/api-contracts/src/dictionary-lookups.ts'
import { lookupMorphology, MorphologyChapterSchema } from './morphology-data.ts'

export type MorphologyReader = (chapter: number, signal: AbortSignal) => Promise<unknown>
const grammarBudgetMs = 200

function withGrammar(page: VersesResponse, grammarFor: (word: QuranWord) => WordGrammar): VersesResponse {
  return {
    ...page,
    verses: page.verses.map(verse => ({
      ...verse,
      ...(verse.words ? { words: verse.words.map(word => {
        const grammar = grammarFor(word)
        if (grammar.status === 'temporarily_unavailable') {
          return { ...word, grammar, availability: { corpus: grammar.status, lane: 'unknown', mufradat: 'unknown' } }
        }
        if (grammar.status === 'unavailable') {
          return { ...word, grammar, availability: { corpus: 'missing', lane: 'unknown', mufradat: 'unknown' } }
        }
        const lexical = dictionaryLookups(grammar).length > 0
        const corpus = lexical ? 'lexical' : 'grammar_only'
        const dictionary = corpus === 'grammar_only' ? 'missing' : 'unknown'
        return { ...word, grammar, availability: { corpus, lane: dictionary, mufradat: dictionary } }
      }) } : {}),
    })),
  }
}

export async function enrichGrammar(page: VersesResponse, chapter: number, requestSignal: AbortSignal, readChapter?: MorphologyReader): Promise<VersesResponse> {
  if (!readChapter || !page.verses.some(verse => verse.words?.length)) return page
  const expiresAt = Date.now() + grammarBudgetMs
  const controller = new AbortController()
  const signal = AbortSignal.any([requestSignal, controller.signal])
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error('Grammar budget exceeded'))
    }, grammarBudgetMs)
  })
  try {
    const raw = await Promise.race([readChapter(chapter, signal), deadline])
    if (Date.now() >= expiresAt) throw new Error('Grammar budget exceeded')
    const data = MorphologyChapterSchema.parse(raw)
    const enriched = withGrammar(page, word => {
      const analysis = lookupMorphology(data, word)
      if (!analysis) return { status: 'unavailable' }
      return WordGrammarSchema.parse({ status: 'available', segments: analysis.segments })
    })
    if (Date.now() >= expiresAt) throw new Error('Grammar budget exceeded')
    return enriched
  } catch {
    return withGrammar(page, () => ({ status: 'temporarily_unavailable' }))
  } finally {
    clearTimeout(timer)
  }
}
