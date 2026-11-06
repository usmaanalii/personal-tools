import { useEffect, useState } from 'react'
import { VERSES_PER_PAGE, type QuranWord, type WordGrammar } from '@scratch-pages/api-contracts/quran'
import { getChapters, getVerses, type Chapter, type Ayah, type VersePage } from './quran-api'

export type SavedVerse = { readonly chapterId: number; readonly verse: Ayah }
export type GrammarRecovery = (word: QuranWord, grammar: WordGrammar) => void

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

type VersesState =
  | { readonly key: string; readonly status: 'loading' }
  | { readonly key: string; readonly status: 'error'; readonly message: string }
  | { readonly key: string; readonly status: 'ready'; readonly data: VersePage }

/** Reading rules and requests stay independent from the reader's screen composition. */
export function useReader(chapters: readonly [Chapter, ...Chapter[]]) {
  const [selected, setSelected] = useState(chapters[0].id)
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [activeVerse, setActiveVerse] = useState<number | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [savedVerses, setSavedVerses] = useState<readonly SavedVerse[]>([])
  const key = `${selected}:${page}:${attempt}`
  const [verseState, setVerseState] = useState<VersesState>({ key, status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    setVerseState({ key, status: 'loading' })
    getVerses(selected, page, controller.signal).then(data => {
      if (!controller.signal.aborted) setVerseState({ key, status: 'ready', data })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setVerseState({ key, status: 'error', message: error instanceof Error ? error.message : 'Unable to load Quran content.' })
    })
    return () => controller.abort()
  }, [selected, page, key])

  const current: VersesState = verseState.key === key ? verseState : { key, status: 'loading' }
  const chapterIndex = chapters.findIndex(item => item.id === selected)
  const chapter = chapters[chapterIndex] ?? chapters[0]
  const openChapter = (id: number, verse = 1) => {
    setSelected(id)
    setPage(Math.ceil(verse / VERSES_PER_PAGE))
    setActiveVerse(null)
  }
  const isVerseSaved = (verse: Ayah) => savedVerses.some(item => item.chapterId === selected && item.verse.number === verse.number)
  const recoverGrammar: GrammarRecovery = (word, grammar) => {
    setVerseState(state => {
      if (state.key !== key || state.status !== 'ready') return state
      return { ...state, data: { ...state.data, verses: state.data.verses.map(verse => {
        if (verse.number !== word.verse || !verse.words) return verse
        return { ...verse, words: verse.words.map(item =>
          item.chapter === word.chapter && item.verse === word.verse && item.position === word.position && item.arabic === word.arabic
            ? { ...item, grammar } : item,
        ) }
      }) } }
    })
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
      bookmarked, savedVerses, isVerseSaved,
      count: savedVerses.length + (bookmarked ? 1 : 0),
    },
    actions: {
      recoverGrammar,
      openChapter,
      openSavedVerse: (chapterId: number, verseNumber: number) => {
        openChapter(chapterId, verseNumber)
        setActiveVerse(verseNumber)
      },
      toggleSavedVerse,
      toggleChapterBookmark: () => setBookmarked(value => !value),
      activateVerse: (verseNumber: number) => setActiveVerse(verseNumber),
      previousPage: () => setPage(value => value - 1),
      nextPage: () => {
        if (current.status === 'ready' && current.data.nextPage !== null) setPage(current.data.nextPage)
      },
      retryVerses: () => setAttempt(value => value + 1),
    },
  }
}
