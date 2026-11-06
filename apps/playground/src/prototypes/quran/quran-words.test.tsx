/// <reference lib="es2024.promise" />
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { WordGrammarSchema, type QuranWord, type VersesResponse } from '@scratch-pages/api-contracts/quran'
import App from '../../app/app'
import { server, quranEndpoint } from '../../test-server'
import { buildWord, chapters } from './quran-fixtures.test-data'
import { importCorpus } from '../../../scripts/quran-data/corpus'

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
  expect(details.getByText('Al-Fātiḥah · 1:1')).toBeVisible()
  expect(details.getByText('English word data · Quran Foundation')).toBeVisible()
  expect(word).toHaveAttribute('aria-pressed', 'true')
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
    .getByText(`Al-Baqarah · 2:${change === 'chapter' ? 1 : 21}`)).toBeVisible()
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

it('expands the selected word into attributed grammatical components while keeping its meaning visible', async () => {
  const chapterRequests: string[] = []
  server.use(http.get('*/quran-data/morphology/1.json', ({ request }) => {
    chapterRequests.push(request.url)
    return HttpResponse.json(grammarChapter())
  }))
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: grammarFixture() })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  expect(await details.findByText('Genitive')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByText('Prefix · Preposition')).toBeVisible()
  expect(details.getByText('Stem · Noun')).toBeVisible()
  expect(details.getByText('سمو')).toHaveAttribute('lang', 'ar')
  expect(details.getByText('ٱسْم')).toHaveAttribute('dir', 'rtl')
  expect(details.getByRole('link', { name: 'Quranic Arabic Corpus v0.4' })).toHaveAttribute('href', 'https://corpus.quran.com/')
  expect(details.getByRole('link', { name: 'Tanzil' })).toHaveAttribute('href', 'https://tanzil.net/')
  expect(details.getByRole('link', { name: 'Data notices' })).toHaveAttribute('href', `${import.meta.env.BASE_URL}quran-data/NOTICE.txt`)
  expect(chapterRequests).toEqual([])
})

it('offers recovery for temporarily unavailable grammar without hiding the meaning or fetching on expansion', async () => {
  const chapterRequests: string[] = []
  server.use(http.get('*/quran-data/morphology/1.json', ({ request }) => {
    chapterRequests.push(request.url)
    return HttpResponse.json(grammarChapter())
  }))
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  expect(details.getByText('Analysis temporarily unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByRole('button', { name: 'Retry grammar' })).toBeVisible()
  expect(chapterRequests).toEqual([])
})

it('retries through the current verse page without losing meaning, reading position or keyboard focus', async () => {
  const { user } = await renderWords({ chapter: 2, verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } })] })
  await user.click(screen.getByRole('button', { name: 'Next verses' }))
  await user.click(await screen.findByRole('button', { name: 'بِسْمِ · 2:21:1' }))
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  const pending = Promise.withResolvers<Response>()
  const requests: string[] = []
  server.use(
    http.get('*/quran-data/morphology/2.json', () => pending.promise),
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
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByText('Al-Baqarah · 2:21')).toBeVisible()
  expect(retry).toHaveAttribute('aria-disabled', 'true')
  expect(retry).toHaveFocus()
  pending.resolve(HttpResponse.json({
    verses: [{ number: 21, arabic: 'بِسْمِ', translationHtml: 'Verse translation', words: [buildWord({ chapter: 2, verse: 21, grammar: grammarFixture() })] }],
    translationName: 'Verse translator', nextPage: null,
  }))
  expect(await details.findByText('Genitive')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.getByRole('button', { name: 'Collapse grammar' })).toHaveFocus()
})

it('keeps the meaning visible when a verse-based grammar retry fails and can recover on another retry', async () => {
  const pending = Promise.withResolvers<Response>()
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
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
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  expect(await details.findByText('Stem · Negative particle')).toBeVisible()
  expect(details.getByText('No root assigned by the corpus.')).toBeVisible()
  expect(details.getByText('لَم')).toHaveAttribute('lang', 'ar')
})

it('keeps the meaning and displays an unavailable analysis outcome from verse data', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  expect(await details.findByText('Analysis unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(details.queryByText('سمو')).not.toBeInTheDocument()
})

it('keeps older verse responses readable without fetching a browser corpus on expansion', async () => {
  const requests: string[] = []
  server.use(http.get('*/quran-data/morphology/1.json', ({ request }) => {
    requests.push(request.url)
    return HttpResponse.json(grammarChapter())
  }))
  const { user, word } = await renderWords()
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  expect(await details.findByText('Analysis unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  expect(requests).toEqual([])
})

it('reuses received grammar and resets disclosure after moving between words and reopening the dialog', async () => {
  const requests: string[] = []
  server.use(http.get('*/quran-data/morphology/1.json', ({ request }) => {
    requests.push(new URL(request.url).pathname)
    return HttpResponse.json(grammarChapter())
  }))
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: grammarFixture() }), buildWord({ position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah', grammar: { status: 'unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  expect(requests).toEqual([])
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  expect(await details.findByText('Genitive')).toBeVisible()
  await user.click(details.getByRole('button', { name: 'Next word' }))
  expect(details.getByRole('button', { name: 'Expand grammar' })).toHaveAttribute('aria-expanded', 'false')
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  expect(await details.findByText('Analysis unavailable.')).toBeVisible()
  await user.click(details.getByRole('button', { name: 'Close word meaning' }))
  await user.click(word)
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Expand grammar' }))
  expect(await within(screen.getByRole('dialog')).findByText('Genitive')).toBeVisible()
  expect(requests).toHaveLength(0)
})

it('cancels a grammar retry when moving to another occurrence and ignores its late response', async () => {
  const pending = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<Request>()
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } }), buildWord({ position: 2, arabic: 'ٱللَّهِ', meaning: 'of Allah', grammar: { status: 'unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  server.use(http.get(`${quranEndpoint}/verses`, ({ request }) => {
    started.resolve(request)
    return pending.promise
  }))
  await user.click(details.getByRole('button', { name: 'Retry grammar' }))
  const request = await started.promise
  expect(details.getByRole('status')).toHaveTextContent('Loading grammar…')
  await user.click(details.getByRole('button', { name: 'Next word' }))
  expect(request.signal.aborted).toBe(true)
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  pending.resolve(HttpResponse.json({ verses: [{ number: 1, arabic: 'بِسْمِ', translationHtml: 'Translation', words: [buildWord({ grammar: grammarFixture() })] }], translationName: 'Translator', nextPage: null }))
  expect(await details.findByText('Analysis unavailable.')).toBeVisible()
  expect(details.getByText('of Allah')).toBeVisible()
  expect(details.queryByText('سمو')).not.toBeInTheDocument()
})

it('retains recovered grammar when the same word is reopened', async () => {
  const { user, word } = await renderWords({ verseWords: [buildWord({ grammar: { status: 'temporarily_unavailable' } })] })
  await user.click(word)
  const details = within(screen.getByRole('dialog'))
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
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
  await user.click(reopened.getByRole('button', { name: 'Expand grammar' }))
  expect(await reopened.findByText('Genitive')).toBeVisible()
  expect(reopened.getByText('In (the) name')).toBeVisible()
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
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
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
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  expect(details.getByText('Analysis unavailable.')).toBeVisible()
  expect(details.getByText('In (the) name')).toBeVisible()
  await user.click(details.getByRole('button', { name: 'Next word' }))
  await user.click(details.getByRole('button', { name: 'Expand grammar' }))
  expect(details.getByText('Stem · Proper noun')).toBeVisible()
  expect(details.getByText('of Allah')).toBeVisible()
})
