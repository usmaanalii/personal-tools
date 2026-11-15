import { useEffect, useState } from 'react'
import { VERSES_PER_PAGE, type QuranWord, type WordGrammar } from '@scratch-pages/api-contracts/quran'
import { getChapters, getVerses, type Chapter, type Ayah, type VersePage } from './quran-api'
import { occurrenceKey } from './use-word-selection'

export type SavedVerse = { readonly chapterId: number; readonly verse: Ayah }
export type RetryGrammar = (word: QuranWord, signal: AbortSignal) => Promise<'recovered' | 'failed'>

function sameOccurrence(word: QuranWord, candidate: QuranWord) {
  return occurrenceKey(candidate) === occurrenceKey(word)
}

type ChaptersState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly chapters: [Chapter, ...Chapter[]] }

export function useChapters() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ChaptersState & { readonly attempt: number }>({ attempt, status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    setState({ attempt, status: 'loading' })
    getChapters(controller.signal).then(chapters => {
      if (!controller.signal.aborted) setState({ attempt, status: 'ready', chapters })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ attempt, status: 'error', message: error instanceof Error ? error.message : 'Unable to load Quran content.' })
    })
    return () => controller.abort()
  }, [attempt])
  const current: ChaptersState = state.attempt === attempt ? state : { status: 'loading' }
  return { state: current, retry: () => setAttempt(value => value + 1) }
}

type ReadingPosition = { readonly chapter: number; readonly page: number; readonly attempt: number }
type VersesState = ReadingPosition & (
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly data: VersePage }
)

/** Reading rules and requests stay independent from the reader's screen composition. */
export function useReader(chapters: readonly [Chapter, ...Chapter[]]) {
  const [current, setCurrent] = useState<VersesState>({ chapter: chapters[0].id, page: 1, attempt: 0, status: 'loading' })
  const { chapter: selected, page, attempt } = current
  const [activeVerse, setActiveVerse] = useState<number | null>(null)
  const [savedChapterIds, setSavedChapterIds] = useState<readonly number[]>([])
  const [savedVerses, setSavedVerses] = useState<readonly SavedVerse[]>([])
  const key = `${selected}:${page}:${attempt}`
  useEffect(() => {
    if (current.status !== 'loading') return
    const controller = new AbortController()
    getVerses(current.chapter, current.page, controller.signal).then(data => {
      if (!controller.signal.aborted) setCurrent(state => state === current ? { ...current, status: 'ready', data } : state)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setCurrent(state => state === current ? {
        ...current, status: 'error', message: error instanceof Error ? error.message : 'Unable to load Quran content.',
      } : state)
    })
    return () => controller.abort()
  }, [current])

  const chapterIndex = chapters.findIndex(item => item.id === selected)
  const chapter = chapters[chapterIndex] ?? chapters[0]
  const goToPage = (chapter: number, page: number) => {
    setCurrent(state => state.chapter === chapter && state.page === page ? state : { chapter, page, attempt: state.attempt, status: 'loading' })
  }
  const openChapter = (id: number, verse = 1) => {
    goToPage(id, Math.ceil(verse / VERSES_PER_PAGE))
    setActiveVerse(null)
  }
  const isVerseSaved = (verse: Ayah) => savedVerses.some(item => item.chapterId === selected && item.verse.number === verse.number)
  const retryGrammar: RetryGrammar = async (word, signal) => {
    const refreshed = await getVerses(word.chapter, Math.ceil(word.verse / VERSES_PER_PAGE), signal)
    signal.throwIfAborted()
    const occurrence = refreshed.verses.find(verse => verse.number === word.verse)?.words?.find(item => sameOccurrence(word, item))
    const compatible = occurrence?.arabic === word.arabic ? occurrence : undefined
    const grammar: WordGrammar = compatible?.grammar ?? { status: 'unavailable' }
    if (grammar.status === 'temporarily_unavailable') return 'failed'

    setCurrent(state => {
      if (state.chapter !== selected || state.page !== page || state.attempt !== attempt || state.status !== 'ready') return state
      return { ...state, data: { ...state.data, verses: state.data.verses.map(verse => {
        if (verse.number !== word.verse || !verse.words) return verse
        return { ...verse, words: verse.words.map(item =>
          sameOccurrence(word, item) ? { ...item, grammar, availability: compatible?.availability } : item,
        ) }
      }) } }
    })
    return 'recovered'
  }
  const toggleSavedVerse = (verse: Ayah) => {
    setSavedVerses(current => {
      const exists = current.some(item => item.chapterId === selected && item.verse.number === verse.number)
      return exists
        ? current.filter(item => item.chapterId !== selected || item.verse.number !== verse.number)
        : [...current, { chapterId: selected, verse }]
    })
  }

  return {
    reading: {
      selected, chapter, page, current, key, activeVerse,
      verses: current.status === 'ready' ? current.data.verses : [],
      previousChapter: chapters[chapterIndex - 1],
      nextChapter: chapters[chapterIndex + 1],
    },
    bookmarks: {
      bookmarked: savedChapterIds.includes(selected),
      savedChapters: chapters.filter(item => savedChapterIds.includes(item.id)),
      savedVerses, isVerseSaved,
      count: savedVerses.length + savedChapterIds.length,
    },
    actions: {
      retryGrammar,
      commitWordPage: (page: number, data: VersePage) => {
        setCurrent({ chapter: selected, page, attempt, status: 'ready', data })
        setActiveVerse(null)
      },
      openChapter,
      openSavedVerse: (chapterId: number, verseNumber: number) => {
        openChapter(chapterId, verseNumber)
        setActiveVerse(verseNumber)
      },
      toggleSavedVerse,
      toggleChapterBookmark: () => setSavedChapterIds(ids => ids.includes(selected)
        ? ids.filter(id => id !== selected)
        : [...ids, selected]),
      activateVerse: (verseNumber: number) => setActiveVerse(verseNumber),
      previousPage: () => goToPage(selected, page - 1),
      nextPage: () => {
        if (current.status === 'ready' && current.data.nextPage !== null) goToPage(selected, current.data.nextPage)
      },
      retryVerses: () => setCurrent({ chapter: selected, page, attempt: attempt + 1, status: 'loading' }),
    },
  }
}
