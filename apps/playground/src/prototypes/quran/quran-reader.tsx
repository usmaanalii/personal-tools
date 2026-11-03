import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@scratch-pages/ui'
import './styles.css'
import { VerseWords } from './verse-words'
import { ChapterList } from './chapter-list'
import { BookmarkList, ChapterBrowser, ChapterRequestStatus, ChapterSearch, type ChapterView, type SavedVerse } from './chapter-browser'
import { ReaderSidebar, ReaderTopbar, ReaderWelcome, ChapterShortcut, ReaderMobileNav } from './reader-chrome'
import { Icon } from './reader-icon'
import { getChapters, getVerses, type Chapter, type Ayah, type VersePage } from './quran-api'

type ChaptersState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; chapters: [Chapter, ...Chapter[]] }

export default function App() {
  const [attempt, setAttempt] = useState(0)
  return <ChapterLoader key={attempt} retry={() => setAttempt(value => value + 1)}/>
}

function ChapterLoader({ retry }: { retry: () => void }) {
  const [state, setState] = useState<ChaptersState>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    getChapters(controller.signal).then(chapters => { if (!controller.signal.aborted) setState({ status: 'ready', chapters }) }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to load Quran content.' })
    })
    return () => controller.abort()
  }, [])
  if (state.status === 'loading') return <main className="quran-reader min-h-screen bg-ui-background font-ui-body text-ui-foreground"><ChapterRequestStatus message="Loading chapters…"/></main>
  if (state.status === 'error') return <main className="quran-reader min-h-screen bg-ui-background font-ui-body text-ui-foreground"><ChapterRequestStatus failed message={state.message} onRetry={retry}/></main>
  return <Reader chapters={state.chapters}/>
}

type VersesState = { key: string; status: 'loading' } | { key: string; status: 'error'; message: string } | { key: string; status: 'ready'; data: VersePage }
function Reader({ chapters }: { chapters: [Chapter, ...Chapter[]] }) {
  const searchToggle = useRef<HTMLButtonElement>(null)
  const readingHeading = useRef<HTMLHeadingElement>(null)
  const restoreReadingFocus = useCallback(() => {
    const active = document.activeElement
    if (!active || active === document.body || !active.isConnected) readingHeading.current?.focus()
  }, [])
  const [selected, setSelected] = useState(chapters[0].id)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([])
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const key = `${selected}:${page}:${attempt}`
  const [verseState, setVerseState] = useState<VersesState>({ key, status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    setVerseState({ key, status: 'loading' })
    getVerses(selected, page, controller.signal).then(data => { if (!controller.signal.aborted) setVerseState({ key, status: 'ready', data }) }).catch((error: unknown) => {
      if (!controller.signal.aborted) setVerseState({ key, status: 'error', message: error instanceof Error ? error.message : 'Unable to load Quran content.' })
    })
    return () => controller.abort()
  }, [selected, page, key])
  const current: VersesState = verseState.key === key ? verseState : { key, status: 'loading' }
  const verses = current.status === 'ready' ? current.data.verses : []
  const [tab, setTab] = useState<ChapterView>('chapters')
  const [activeVerse, setActiveVerse] = useState<number | null>(null)
  const chapterIndex = chapters.findIndex(item => item.id === selected)
  const chapter = chapters[chapterIndex] ?? chapters[0]
  const previousChapter = chapters[Math.max(0, chapterIndex - 1)] ?? chapter
  const nextChapter = chapters[Math.min(chapters.length - 1, chapterIndex + 1)] ?? chapter
  const visibleChapters = chapters.filter(item => `${item.name} ${item.meaning} ${item.id}`.toLowerCase().includes(query.toLowerCase()))
  const openChapter = (id: number, verse = 1) => { setSelected(id); setPage(Math.ceil(verse / 20)); setActiveVerse(null) }
  const isVerseSaved = (verse: Ayah) => savedVerses.some(item => item.chapterId === selected && item.verse.number === verse.number)
  const toggleSavedVerse = (verse: Ayah) => {
    setSavedVerses(current => {
      const exists = current.some(item => item.chapterId === selected && item.verse.number === verse.number)
      return exists
        ? current.filter(item => item.chapterId !== selected || item.verse.number !== verse.number)
        : [...current, { chapterId: selected, verse }]
    })
  }

  return <main className="quran-reader grid min-h-screen bg-ui-background font-ui-body text-ui-foreground lg:grid-cols-[14rem_minmax(0,1fr)] [&_button]:scroll-mb-28">
    <ReaderSidebar onBookmarks={() => setTab('bookmarks')}/>
    <section className="min-w-0">
      <ReaderTopbar searchOpen={searchOpen} searchRef={searchToggle} onToggleSearch={() => setSearchOpen(!searchOpen)}/>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-6 pb-28 sm:px-8 lg:grid-cols-2 lg:py-8">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <ReaderWelcome/>
          <ChapterShortcut onOpen={() => openChapter(2)}/>
          <ChapterBrowser total={chapters.length} tab={tab} onTabChange={setTab} bookmarkCount={savedVerses.length + (bookmarked ? 1 : 0)}
            search={searchOpen && <ChapterSearch query={query} onQueryChange={setQuery} onClose={() => { setSearchOpen(false); setQuery(''); searchToggle.current?.focus() }}/>}
          >
            {tab === 'chapters'
              ? <ChapterList chapters={visibleChapters} selectedId={selected} onSelect={openChapter}/>
              : <BookmarkList chapters={chapters} bookmarkedChapter={bookmarked ? chapter : null} savedVerses={savedVerses} onOpenChapter={openChapter}
                  onOpenVerse={(chapterId, verseNumber) => { openChapter(chapterId, verseNumber); setActiveVerse(verseNumber) }}/>
            }
          </ChapterBrowser>
        </div>
        <aside aria-label="Current chapter" className="order-2 min-w-0 self-start rounded-ui-card border border-solid border-ui-border bg-ui-surface p-4 shadow-ui-card sm:p-6 lg:order-none">
          <div className="flex items-start justify-between gap-3 border-0 border-b border-solid border-ui-border pb-4">
            <div className="min-w-0 wrap-anywhere">
              <p className="mt-0 mb-2 text-xs font-bold tracking-widest text-ui-muted">NOW READING</p>
              <h2 ref={readingHeading} tabIndex={-1} className="m-0 font-ui-heading text-xl font-semibold">{chapter.name}</h2>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-ui-muted">{chapter.meaning} · {chapter.place} · {chapter.verses} verses</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Bookmark this chapter" aria-pressed={bookmarked} onClick={() => setBookmarked(!bookmarked)}><Icon name="bookmark"/></Button>
          </div>
          <div className="surah-heading"><div className="surah-line"/><span translate="no" lang="ar" dir="rtl">سُورَةُ {chapter.arabic}</span><div className="surah-line"/></div>{selected !== 1 && selected !== 9 && page === 1 && <div className="bismillah" translate="no" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>}<div className="verse-list" aria-busy={current.status === 'loading'}>
          {current.status === 'loading' && <p role="status">Loading verses…</p>}
          {current.status === 'error' && <div><p role="alert">{current.message}</p><Button onClick={() => setAttempt(value => value + 1)}>Retry verses</Button></div>}
          {current.status === 'ready' && <p className="translation-credit">{current.data.translationName} · Quran Foundation</p>}{verses.map(verse => <article key={`${key}-${verse.number}`} className={`verse ${activeVerse === verse.number ? 'verse-selected' : ''}`}><div className="verse-toolbar"><span className="verse-index"><span>۞</span> {selected}:{verse.number}</span><div><button type="button" aria-label="Audio coming soon" className="tiny-action" disabled><Icon name="play" size={16}/></button><button type="button" aria-label={`Bookmark verse ${verse.number}`} aria-pressed={isVerseSaved(verse)} className="tiny-action" onClick={event => { event.stopPropagation(); toggleSavedVerse(verse); setActiveVerse(verse.number) }}><Icon name="bookmark" size={16}/></button><button type="button" aria-label="More verse actions" className="tiny-action" onClick={event => { event.stopPropagation(); setActiveVerse(verse.number) }}><Icon name="more" size={17}/></button></div></div><VerseWords verse={verse} chapterName={chapter.name} restoreReadingFocus={restoreReadingFocus}/><p className="translation">{verse.translation}</p></article>)}</div><div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous verses</Button>
          <span>Page {page}</span>
          <Button variant="outline" disabled={current.status !== 'ready' || current.data.nextPage === null} onClick={() => { if (current.status === 'ready' && current.data.nextPage) setPage(current.data.nextPage) }}>Next verses</Button>
        </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-0 border-t border-solid border-ui-border pt-4">
            <Button variant="ghost" className="min-w-0 flex-1 basis-40" disabled={chapterIndex === 0} onClick={() => openChapter(previousChapter.id)}><Icon name="back" size={17}/><span className="min-w-0 text-left wrap-anywhere"><span className="block text-xs whitespace-nowrap">PREVIOUS</span>{chapterIndex > 0 ? previousChapter.name : 'Beginning'}</span></Button>
            <Button variant="ghost" className="min-w-0 flex-1 basis-40" disabled={chapterIndex === chapters.length - 1} onClick={() => openChapter(nextChapter.id)}><span className="min-w-0 text-right wrap-anywhere"><span className="block text-xs whitespace-nowrap">NEXT</span>{chapterIndex < chapters.length - 1 ? nextChapter.name : 'End of Quran'}</span><Icon name="next" size={17}/></Button>
          </div>
        </aside>
      </div>
      <ReaderMobileNav onExplore={() => setSearchOpen(true)} onBookmarks={() => setTab('bookmarks')}/>
    </section>
  </main>
}
