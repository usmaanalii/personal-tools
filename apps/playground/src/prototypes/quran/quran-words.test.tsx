/// <reference lib="es2024.promise" />
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { WordGrammarSchema, type QuranWord, type VersesResponse } from '@scratch-pages/api-contracts/quran'
import App from '../../app/app'
import { server, quranEndpoint } from '../../test-server'
import { buildLanePage, buildWord, chapters } from './quran-fixtures.test-data'
import { importCorpus } from '../../../scripts/quran-data/corpus'
import { buildMufradatEntry } from './mufradat-fixtures.test-data'

function grammarChapter() {
  const chapter = importCorpus('(1:1:1:1)\tbi\tP\tPREFIX|bi+\n(1:1:1:2)\tsomi\tN\tSTEM|POS:N|LEM:{som|ROOT:smw|M|GEN').chapters['1']
  if (!chapter) throw new Error('Expected Al-Fatihah morphology fixture')
  return chapter
}
function grammarFixture() {
  return WordGrammarSchema.parse({ status: 'available', segments: grammarChapter().words['1:1:1']?.segments })
}

function words() {
  return [buildWord(), buildWord({ position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah', transliteration: 'l-lahi' })]
}

async function renderWords({ verseWords = words(), chapter = 1, verseNumber = 1 }: { verseWords?: QuranWord[]; chapter?: number; verseNumber?: number } = {}) {
  const firstWord = verseWords[0]
  if (!firstWord) throw new Error('Expected a selectable word fixture')
  const buildPage = (chapter: number, verse: number, nextPage: number | null): VersesResponse => ({
    verses: [{ number: verse, arabic: verseWords.map(word => word.arabic).join(' '), translationHtml: 'Verse translation',
      words: verseWords.map(word => ({ ...word, chapter, verse })),
    }], translationName: 'Verse translator', nextPage,
  })
  const pages = new Map<string, VersesResponse>([
    ['1:1', buildPage(1, verseNumber, null)],
    ['2:1', buildPage(2, 1, 2)],
    ['2:2', buildPage(2, 21, null)],
    [`${chapter}:1`, buildPage(chapter, verseNumber, chapter === 2 ? 2 : null)],
  ])
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const params = new URL(request.url).searchParams
    const page = pages.get(`${params.get('chapter')}:${params.get('page')}`)
    return page ? HttpResponse.json(page) : HttpResponse.json({ error: 'No fixture for this chapter and page' }, { status: 404 })
  }))
  window.history.pushState({}, '', '/quran/')
  render(<App />)
  const user = userEvent.setup()
  await screen.findByRole('button', { name: `${firstWord.arabic} · 1:${verseNumber}:1` })
  if (chapter !== 1) await user.click(screen.getByRole('button', { name: new RegExp(`^${chapter}\\s*${chapters.find(item => item.id === chapter)?.name}`) }))
  const word = await screen.findByRole('button', { name: `${firstWord.arabic} · ${chapter}:${verseNumber}:1` })
  return { user, word }
}
afterEach(() => window.history.pushState({}, '', '/'))

it('shows each reported source in Corpus, Lane and Mufradāt order without loading articles', async () => {
  const articleRequests: string[] = []
  server.use(http.get(`${quranEndpoint}/:source/entries`, ({ request }) => {
    articleRequests.push(request.url)
    return new HttpResponse(null, { status: 500 })
  }))
  const { user, word } = await renderWords({ verseWords: [
    buildWord({ availability: { corpus: 'lexical', lane: 'missing', mufradat: 'indexed' } }),
    buildWord({ position: 2, arabic: 'ٱللَّهِ', availability: { corpus: 'lexical', lane: 'multiple', mufradat: 'multiple' } }),
    buildWord({
      position: 3, arabic: 'وَٱلَّذِينَ',
      grammar: { status: 'available', segments: [{ kind: 'stem', arabic: 'ٱلَّذِينَ', partOfSpeech: 'Relative pronoun', root: null, lemma: null, features: [] }] },
      availability: { corpus: 'grammar_only', lane: 'missing', mufradat: 'missing' },
    }),
    buildWord({ position: 4, arabic: 'أُنزِلَ', availability: { corpus: 'temporarily_unavailable', lane: 'unknown', mufradat: 'temporarily_unavailable' } }),
    buildWord({ position: 5, arabic: 'إِلَيْكَ', availability: { corpus: 'missing', lane: 'indexed', mufradat: 'unknown' } }),
  ] })

  expect(word).toHaveTextContent('بِسْمِ●○●')
  expect(word).toHaveAccessibleDescription('Corpus: Available. Lane: No indexed match. Mufradāt: Indexed.')
  expect(screen.getByRole('button', { name: 'ٱللَّهِ · 1:1:2' })).toHaveTextContent('●●●')
  const grammarOnly = screen.getByRole('button', { name: 'وَٱلَّذِينَ · 1:1:3' })
  expect(grammarOnly).toHaveTextContent('●○○')
  expect(grammarOnly).toHaveAccessibleDescription('Corpus: Grammar only. Lane: No indexed match. Mufradāt: No indexed match.')
  const outage = screen.getByRole('button', { name: 'أُنزِلَ · 1:1:4' })
  expect(outage).toHaveTextContent('○○○')
  expect(outage).toHaveAccessibleDescription('Corpus: Temporarily unavailable. Lane: Unknown. Mufradāt: Temporarily unavailable.')
  const mixed = screen.getByRole('button', { name: 'إِلَيْكَ · 1:1:5' })
  expect(mixed).toHaveTextContent('○●○')
  expect(mixed).toHaveAccessibleDescription('Corpus: No analysis. Lane: Indexed. Mufradāt: Unknown.')
  await user.click(word)
  expect(screen.getByRole('tab', { name: 'Grammar', selected: true })).toBeVisible()
  expect(articleRequests).toEqual([])
})

it('reuses a no-match result when word details are reopened', async () => {
  const requests: string[] = []
  server.use(http.get(`${quranEndpoint}/mufradat/entries`, ({ request }) => { requests.push(request.url); return HttpResponse.json({ status: 'missing' }) }))
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: grammarFixture() })] })
  await user.click(word)
  await user.click(screen.getByRole('tab', { name: 'Mufradāt' }))
  await screen.findByText('No verified Mufradāt entry is available for this word.')
  await user.click(screen.getByRole('button', { name: 'Close word meaning' }))
  await user.click(word)
  await user.click(screen.getByRole('tab', { name: 'Mufradāt' }))
  await screen.findByText('No verified Mufradāt entry is available for this word.')
  expect(requests).toHaveLength(1)
})

it('keeps words readable and identifies unreported availability in an older response', async () => {
  const { user, word } = await renderWords()

  expect(word).toHaveTextContent('بِسْمِ○○○')
  expect(word).toHaveAccessibleDescription('Source availability not reported.')
  await user.click(word)
  expect(within(screen.getByRole('dialog')).getByText('In (the) name')).toBeVisible()
})

it('explains circle order and what a hollow circle means in the reading panel', async () => {
  await renderWords()

  const reading = within(screen.getByRole('complementary', { name: 'Current chapter' }))
  expect(reading.getByText('Left to right: Corpus, Lane, Mufradāt.')).toBeVisible()
  expect(reading.getByText('Available or indexed')).toBeVisible()
  expect(reading.getByText('Missing, unknown or temporarily unavailable')).toBeVisible()
})

it('reuses a loaded entry when word details are reopened', async () => {
  const entry = buildMufradatEntry('jk-l7446')
  const opening = entry.paragraphs[0]
  if (!opening) throw new Error('Expected an opening paragraph in the reviewed name entry')
  const requests: string[] = []
  server.use(http.get(`${quranEndpoint}/mufradat/entries`, ({ request }) => {
    const query = new URL(request.url).searchParams
    if (query.get('root') !== 'سمو' || query.get('lemma') !== 'ٱسْم') return new HttpResponse(null, { status: 400 })
    requests.push(request.url)
    return HttpResponse.json({ status: 'matched', entry })
  }))
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: grammarFixture() })] })
  await user.click(word)
  await user.click(screen.getByRole('tab', { name: 'Mufradāt' }))
  expect(within(await screen.findByRole('article', { name: entry.headword })).getByText(opening)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Close word meaning' }))
  await user.click(word)
  await user.click(screen.getByRole('tab', { name: 'Mufradāt' }))
  expect(within(await screen.findByRole('article', { name: entry.headword })).getByText(opening)).toBeVisible()
  expect(requests).toHaveLength(1)
})

it('loads Mufradāt only when opened and leaves grammar and contextual meaning usable', async () => {
  const requests: string[] = []
  server.use(http.get(`${quranEndpoint}/mufradat/entries`, ({ request }) => { requests.push(request.url); return HttpResponse.json({ status: 'missing' }) }))
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: grammarFixture() })] })
  await user.click(word)
  expect(requests).toEqual([])
  await user.click(screen.getByRole('tab', { name: 'Mufradāt' }))
  const panel = within(screen.getByRole('tabpanel', { name: 'Mufradāt' }))
  expect(await panel.findByText('No verified Mufradāt entry is available for this word.')).toBeVisible()
  expect(panel.getByText('In (the) name')).toBeVisible()
  expect(requests).toHaveLength(1)
  await user.click(screen.getByRole('tab', { name: 'Grammar' }))
  expect(screen.getByText('Stem · Noun')).toBeVisible()
})

it('shows Grammar initially and retains Dictionary when the next word is selected', async () => {
  const requests: string[] = []
  server.use(http.get(`${quranEndpoint}/dictionary/entries`, ({ request }) => {
    requests.push(request.url)
    return HttpResponse.json(buildLanePage({ entries: [] }))
  }))
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: grammarFixture() }), buildWord({ position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah' })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(details.getByRole('tab', { name: 'Grammar', selected: true })).toBeVisible()
  expect(details.getByText('Stem · Noun')).toBeVisible()
  expect(requests).toEqual([])
  await user.click(details.getByRole('tab', { name: 'Dictionary' }))
  expect(await details.findByText('No verified Lane’s entry is available for this word.')).toBeVisible()
  expect(details.queryByText('Stem · Noun')).not.toBeInTheDocument()
  await user.click(details.getByRole('button', { name: 'Next word' }))
  expect(details.getByRole('tab', { name: 'Dictionary', selected: true })).toBeVisible()
  expect(details.getByText('of Allah')).toBeVisible()
})

it("shows a word's details when it is selected", async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog', { name: 'Word meaning' }))
  const arabic = details.getByText('بِسْمِ')
  expect(arabic).toBeVisible()
  expect(arabic).toHaveAttribute('lang', 'ar')
  expect(arabic).toHaveAttribute('dir', 'rtl')
  expect(arabic).toHaveAttribute('translate', 'no')
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByText("bis'mi")).toBeVisible()
  expect(details.getByText('Al-Fātiḥah · Verse 1')).toBeVisible()
  expect(details.getByText('English word data · Quran Foundation')).toBeVisible()
  expect(word).toHaveAttribute('aria-pressed', 'true')
})

it('keeps English word attribution in the active reading panel', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const summary = within(screen.getByLabelText('Word summary'))
  expect(summary.queryByText('English word data · Quran Foundation')).not.toBeInTheDocument()
  const panel = within(screen.getByRole('tabpanel', { name: 'Grammar' }))
  expect(panel.getByText('In (the) name')).toBeVisible()
  expect(within(panel.getByLabelText('Word sources')).getByText('English word data · Quran Foundation')).toBeVisible()
})

it('opens Dictionary within the selected word while keeping its meaning and verse context', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog', { name: 'Word meaning' }))
  await user.click(details.getByRole('tab', { name: 'Dictionary' }))
  expect(await details.findByText('Verified morphology is unavailable for this word.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByText('Al-Fātiḥah · Verse 1')).toBeVisible()
})

it('retains Grammar for the next word after switching back from Dictionary', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog', { name: 'Word meaning' }))
  await user.click(details.getByRole('tab', { name: 'Dictionary' }))
  expect(await details.findByText('Verified morphology is unavailable for this word.')).toBeVisible()

  await user.click(details.getByRole('tab', { name: 'Grammar' }))

  expect(details.getByText('Analysis unavailable.')).toBeVisible()
  await user.click(details.getByRole('button', { name: 'Next word' }))
  expect(details.getByText('of Allah')).toBeVisible()
  expect(details.getByRole('tab', { name: 'Grammar', selected: true })).toBeVisible()
})

it('reuses dictionary results when word details are closed and reopened', async () => {
  const requests: string[] = []
  server.use(http.get(`${quranEndpoint}/dictionary/entries`, ({ request }) => {
    requests.push(request.url)
    return HttpResponse.json(buildLanePage({ entries: [] }))
  }))
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: grammarFixture() })] })
  await user.click(word)
  await user.click(screen.getByRole('tab', { name: 'Dictionary' }))
  expect(await screen.findByText('No verified Lane’s entry is available for this word.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Close word meaning' }))
  await user.click(word)
  await user.click(screen.getByRole('tab', { name: 'Dictionary' }))
  expect(await screen.findByText('No verified Lane’s entry is available for this word.')).toBeVisible()
  expect(requests).toHaveLength(1)
})

it('shows adjacent words in the same verse when Previous or Next is selected', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(details.getByRole('button', { name: 'Previous word' })).toBeDisabled()
  await user.click(details.getByRole('button', { name: 'Next word' }))
  expect(details.getByText('of Allah')).toBeVisible()
  expect(word).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: 'ٱللَّهِ · 1:1:2', hidden: true })).toHaveAttribute('aria-pressed', 'true')
  expect(details.queryByText('In (the) name')).not.toBeInTheDocument()
  expect(details.getByRole('button', { name: 'Next word' })).toBeDisabled()
  await user.click(details.getByRole('button', { name: 'Previous word' }))
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(word).toHaveAttribute('aria-pressed', 'true')
})

it('returns to the last selected word when word details are closed', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Next word' }))
  await user.click(details.getByRole('button', { name: 'Close word meaning' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const lastWord = screen.getByRole('button', { name: 'ٱللَّهِ · 1:1:2' })
  expect(lastWord).toHaveFocus()
  expect(lastWord).toHaveAttribute('aria-pressed', 'false')
  expect(word).toHaveAttribute('aria-pressed', 'false')
})

it('returns to the selected word when Escape dismisses its details', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(word).toHaveFocus()
  expect(word).toHaveAttribute('aria-pressed', 'false')
})

it.each(['chapter', 'page'])('shows word details from another %s after closing the previous details', async change => {
  const { user, word } = await renderWords({ chapter: change === 'page' ? 2 : 1 })
  await user.click(word)
  await user.click(screen.getByRole('button', { name: 'Close word meaning' }))
  await user.click(screen.getByRole('button', { name: change === 'chapter' ? /^NEXT/ : 'Next verses' }))
  const nextWord = await screen.findByRole('button', { name: `بِسْمِ · 2:${change === 'chapter' ? 1 : 21}:1` })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(nextWord).toHaveAttribute('aria-pressed', 'false')
  await user.click(nextWord)
  expect(within(screen.getByRole('dialog', { name: 'Word meaning' }))
    .getByText(`Al-Baqarah · Verse ${change === 'chapter' ? 1 : 21}`)).toBeVisible()
})

it('disables Previous and Next when a verse contains one word', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord()] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(details.getByText('Word 1 of 1')).toBeVisible()
  expect(details.getByRole('button', { name: 'Previous word' })).toBeDisabled()
  expect(details.getByRole('button', { name: 'Next word' })).toBeDisabled()
})

it("shows when a word's meaning or pronunciation is unavailable", async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ meaning: null, transliteration: null })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(details.getByText('Meaning unavailable for this word.')).toBeVisible()
  expect(details.getByText('Transliteration unavailable')).toBeVisible()
})

it('keeps source links in one reader section while showing word grammar', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: grammarFixture() })] })
  const sources = within(screen.getByRole('region', { name: 'Sources' }))
  expect(sources.getByRole('link', { name: 'Quranic Arabic Corpus v0.4' })).toHaveAttribute('href', 'https://corpus.quran.com/')
  expect(sources.getByRole('link', { name: 'Tanzil' })).toHaveAttribute('href', 'https://tanzil.net/')
  expect(sources.getByRole('link', { name: 'Data notices' })).toHaveAttribute('href', `${import.meta.env.BASE_URL}quran-data/NOTICE.txt`)
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(await details.findByText('Genitive')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByText('Prefix · Preposition')).toBeVisible()
  expect(details.getByText('Stem · Noun')).toBeVisible()
  expect(details.getByText('سمو')).toHaveAttribute('lang', 'ar')
  expect(details.getByText('ٱسْم')).toHaveAttribute('dir', 'rtl')
  expect(details.queryByRole('link')).not.toBeInTheDocument()
  await user.click(details.getByRole('button', { name: 'Close word meaning' }))
  expect(screen.getAllByRole('link', { name: 'Quranic Arabic Corpus v0.4' })).toHaveLength(1)
  expect(screen.getAllByRole('link', { name: 'Tanzil' })).toHaveLength(1)
  expect(screen.getAllByRole('link', { name: 'Data notices' })).toHaveLength(1)
})

it('shows Retry grammar and the word meaning when analysis is temporarily unavailable', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(details.getByText('Analysis temporarily unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByRole('button', { name: 'Retry grammar' })).toBeVisible()
})

it('retries through the current verse page without losing meaning, reading position or keyboard focus', async () => {
  const { user } = await renderWords({ chapter: 2, verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } })] })
  await user.click(screen.getByRole('button', { name: 'Next verses' }))
  await user.click(await screen.findByRole('button', { name: 'بِسْمِ · 2:21:1' }))
  const details = within(screen.getByRole('dialog'))
  const pending = Promise.withResolvers<Response>()
  const requests: string[] = []
  server.use(
    http.get(`${quranEndpoint}/verses`, ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(`${params.get('chapter')}:${params.get('page')}`)
      return pending.promise
    }),
  )
  const retry = details.getByRole('button', { name: 'Retry grammar' })
  await user.click(retry)
  expect(requests).toEqual(['2:2'])
  expect(details.getByRole('status')).toHaveTextContent('Loading grammar…')
  const analysis = details.getByRole('region', { name: 'Grammar analysis' })
  expect(analysis).not.toContainElement(details.getByRole('status'))
  expect(analysis).toHaveAttribute('aria-busy', 'true')
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByText('Al-Baqarah · Verse 21')).toBeVisible()
  expect(retry).toHaveAttribute('aria-disabled', 'true')
  expect(retry).toHaveFocus()
  pending.resolve(HttpResponse.json({
    verses: [{ number: 21, arabic: 'بِسْمِ', translationHtml: 'Verse translation', words: [buildWord({ chapter: 2, verse: 21, grammar: grammarFixture() })] }],
    translationName: 'Verse translator', nextPage: null,
  }))
  expect(await details.findByText('Genitive')).toBeVisible()
  expect(analysis).toHaveAttribute('aria-busy', 'false')
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByRole('region', { name: 'Grammar analysis' })).toHaveFocus()
})

it('updates the selected word indicators when grammar retry returns fresh availability', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({
    grammar: { status: 'temporarily_unavailable' },
    availability: { corpus: 'temporarily_unavailable', lane: 'unknown', mufradat: 'unknown' },
  })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  server.use(http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({
    verses: [{ number: 1, arabic: 'بِسْمِ', translationHtml: 'Verse translation', words: [buildWord({
      grammar: grammarFixture(), availability: { corpus: 'lexical', lane: 'indexed', mufradat: 'indexed' },
    })] }],
    translationName: 'Verse translator', nextPage: null,
  })))

  await user.click(details.getByRole('button', { name: 'Retry grammar' }))
  await details.findByText('Genitive')
  await user.click(details.getByRole('button', { name: 'Close word meaning' }))
  expect(word).toHaveFocus()
  expect(word).toHaveTextContent('بِسْمِ●●●')
  expect(word).toHaveAccessibleDescription('Corpus: Available. Lane: Indexed. Mufradāt: Indexed.')
})

it('keeps the meaning visible when a verse-based grammar retry fails and can recover on another retry', async () => {
  const pending = Promise.withResolvers<Response>()
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  server.use(http.get(`${quranEndpoint}/verses`, () => pending.promise))
  await user.click(details.getByRole('button', { name: 'Retry grammar' }))
  expect(details.getByRole('status')).toHaveTextContent('Loading grammar…')
  expect(details.getByText('In (the) name')).toBeVisible()
  pending.resolve(HttpResponse.json({}, { status: 503 }))
  expect(await details.findByText('Analysis temporarily unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  server.use(http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({ verses: [{ number: 1, arabic: 'بِسْمِ', translationHtml: 'Translation', words: [buildWord({ grammar: grammarFixture() })] }], translationName: 'Translator', nextPage: null })))
  await user.click(details.getByRole('button', { name: 'Retry grammar' }))
  expect(await details.findByText('Genitive')).toBeVisible()
})

it('accurately labels a rootless particle without inventing a root or lemma', async () => {
  const chapter = importCorpus('(112:3:1:1)\tlamo\tNEG\tSTEM|POS:NEG|LEM:lam').chapters['112']
  const { user, word } = await renderWords({ chapter: 112, verseNumber: 3, verseWords: [
    buildWord({ arabic: 'لَمْ', meaning: 'not', grammar: WordGrammarSchema.parse({ status: 'available', segments: chapter?.words['112:3:1']?.segments }) }),
  ] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(await details.findByText('Stem · Negative particle')).toBeVisible()
  expect(details.getByText('No root assigned by the corpus.')).toBeVisible()
  expect(details.getByText('لَم')).toHaveAttribute('lang', 'ar')
})

it('keeps the meaning and displays an unavailable analysis outcome from verse data', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(await details.findByText('Analysis unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.queryByText('سمو')).not.toBeInTheDocument()
})

it('shows the word meaning when grammar is missing', async () => {
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(await details.findByText('Analysis unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
})

it('reuses received grammar after moving between words and reopening the dialog', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: grammarFixture() }), buildWord({ position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah', grammar: { status: 'unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(await details.findByText('Genitive')).toBeVisible()
  await user.click(details.getByRole('button', { name: 'Next word' }))
  expect(details.getByRole('tab', { name: 'Grammar', selected: true })).toBeVisible()
  expect(await details.findByText('Analysis unavailable.')).toBeVisible()
  await user.click(details.getByRole('button', { name: 'Close word meaning' }))
  await user.click(word)
  expect(await within(screen.getByRole('dialog')).findByText('Genitive')).toBeVisible()
})

it('cancels a grammar retry when moving to another occurrence and ignores its late response', async () => {
  const pending = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<Request>()
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } }), buildWord({ position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah', grammar: { status: 'unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    started.resolve(request)
    return pending.promise
  }))
  await user.click(details.getByRole('button', { name: 'Retry grammar' }))
  const request = await started.promise
  expect(details.getByRole('status')).toHaveTextContent('Loading grammar…')
  await user.click(details.getByRole('button', { name: 'Next word' }))
  expect(request.signal.aborted).toBe(true)
  pending.resolve(HttpResponse.json({ verses: [{ number: 1, arabic: 'بِسْمِ', translationHtml: 'Translation', words: [buildWord({ grammar: grammarFixture() })] }], translationName: 'Translator', nextPage: null }))
  expect(await details.findByText('Analysis unavailable.')).toBeVisible()
  expect(details.getByText('of Allah')).toBeVisible()
  expect(details.queryByText('سمو')).not.toBeInTheDocument()
})

it('retains recovered grammar when the same word is reopened', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const params = new URL(request.url).searchParams
    if (params.get('chapter') !== '1' || params.get('page') !== '1') return HttpResponse.json({ error: 'Unexpected verse page' }, { status: 404 })
    return HttpResponse.json({
      verses: [{ number: 1, arabic: 'بِسْمِ', translationHtml: 'Translation', words: [buildWord({ grammar: grammarFixture() })] }],
      translationName: 'Translator', nextPage: null,
    })
  }))
  await user.click(details.getByRole('button', { name: 'Retry grammar' }))
  expect(await details.findByText('Genitive')).toBeVisible()
  await user.click(details.getByRole('button', { name: 'Close word meaning' }))
  await user.click(word)
  const reopened = within(screen.getByRole('dialog'))
  expect(await reopened.findByText('Genitive')).toBeVisible()
  expect(reopened.getByText('In (the) name')).toBeVisible()
})

it('keeps the original word when a grammar retry returns a different spelling at its position', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  server.use(http.get(`${quranEndpoint}/verses`, () => HttpResponse.json({
    verses: [{ number: 1, arabic: 'ٱللَّهِ', translationHtml: 'Translation', words: [buildWord({ arabic: 'ٱللَّهِ', grammar: grammarFixture() })] }],
    translationName: 'Translator', nextPage: null,
  })))
  await user.click(details.getByRole('button', { name: 'Retry grammar' }))
  expect(await details.findByText('Analysis unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
})

it('retains recovered grammar for the selected occurrence when moving between words', async () => {
  const first = buildWord({ grammar: { status: 'unavailable' } })
  const second = buildWord({ position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah', grammar: { status: 'temporarily_unavailable' } })
  const chapter = importCorpus('(1:1:2:1)\t{ll~ahi\tPN\tSTEM|POS:PN|LEM:{ll~ah|ROOT:Alh|GEN').chapters['1']
  const grammar = WordGrammarSchema.parse({ status: 'available', segments: chapter?.words['1:1:2']?.segments })
  const { user, word } = await renderWords({ verseWords: [first, second] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Next word' }))
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    const params = new URL(request.url).searchParams
    if (params.get('chapter') !== '1' || params.get('page') !== '1') return HttpResponse.json({ error: 'Unexpected verse page' }, { status: 404 })
    return HttpResponse.json({
      verses: [{ number: 1, arabic: 'بِسْمِ ٱللَّهِ', translationHtml: 'Translation', words: [first, { ...second, grammar }] }],
      translationName: 'Translator', nextPage: null,
    })
  }))
  await user.click(details.getByRole('button', { name: 'Retry grammar' }))
  expect(await details.findByText('Stem · Proper noun')).toBeVisible()
  await user.click(details.getByRole('button', { name: 'Previous word' }))
  expect(details.getByText('Analysis unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  await user.click(details.getByRole('button', { name: 'Next word' }))
  expect(details.getByText('Stem · Proper noun')).toBeVisible()
  expect(details.getByText('of Allah')).toBeVisible()
})
