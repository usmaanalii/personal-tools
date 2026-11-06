import type { Page } from '@playwright/test'
import type { VersesResponse } from '@scratch-pages/api-contracts/quran'
import { chapters, alFatihah, buildOpeningVerse } from '../../../src/prototypes/quran/quran-fixtures.test-data'
import { importCorpus } from '../../../scripts/quran-data/corpus'
import { enrichGrammar } from '../../../../../supabase/functions/quran/morphology'

// Browser UI fixture: this does not exercise the hosted Edge Function or Quran API.
export async function mockQuranContent(page: Page, options: { meaning?: string; temporaryGrammarFailure?: boolean } = {}) {
  const source = importCorpus('(1:1:1:1)\tbi\tP\tPREFIX|bi+\n(1:1:1:2)\tsomi\tN\tSTEM|POS:N|LEM:{som|ROOT:smw|M|GEN').chapters['1']
  const response: VersesResponse = await enrichGrammar({
    verses: alFatihah.map(verse => ({ number: verse.number, arabic: verse.arabic, translationHtml: verse.translation,
      ...(verse.number === 1 ? { words: buildOpeningVerse(options.meaning).words } : {}),
    })), translationName: 'Dr. Mustafa Khattab, The Clear Quran', nextPage: null,
  }, 1, new AbortController().signal, async () => source)
  await page.route('**/functions/v1/quran/v2/chapters', route => route.fulfill({ json: { chapters } }))
  await page.route('**/functions/v1/quran/v2/verses?*', route => {
    const params = new URL(route.request().url()).searchParams
    if (params.get('chapter') !== '1' || params.get('page') !== '1') {
      return route.fulfill({ status: 404, json: { error: 'No fixture for this chapter and page' } })
    }
    const json = options.temporaryGrammarFailure ? { ...response, verses: response.verses.map(verse => ({ ...verse, words: verse.words?.map(word => ({ ...word, grammar: { status: 'temporarily_unavailable' } })) })) } : response
    return route.fulfill({ json })
  })
  return response
}
