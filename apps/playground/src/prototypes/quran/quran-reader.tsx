import { useRef, useState } from 'react'
import { Button } from '@scratch-pages/ui'
import './styles.css'
import { VerseView } from './verse-view'
import { ChapterList } from './chapter-list'
import { BookmarkList, ChapterBrowser, ChapterRequestStatus, ChapterSearch, type ChapterView } from './chapter-browser'
import { ReaderSidebar, ReaderTopbar, ReaderWelcome, ChapterShortcut, ReaderMobileNav } from './reader-chrome'
import { Icon } from './reader-icon'
import type { Chapter } from './quran-api'
import { useChapters, useReader } from './use-reader'

export default function App() {
  const { state, retry } = useChapters()
  if (state.status === 'loading') return <main className="quran-reader min-h-screen bg-ui-background font-ui-body text-ui-foreground"><ChapterRequestStatus message="Loading chapters…"/></main>
  if (state.status === 'error') return <main className="quran-reader min-h-screen bg-ui-background font-ui-body text-ui-foreground"><ChapterRequestStatus failed message={state.message} onRetry={retry}/></main>
  return <Reader chapters={state.chapters}/>
}

function Reader({ chapters }: { chapters: [Chapter, ...Chapter[]] }) {
  const searchToggle = useRef<HTMLButtonElement>(null)
  const readingHeading = useRef<HTMLHeadingElement>(null)
  const { reading, bookmarks, actions } = useReader(chapters)
  const { selected, chapter, previousChapter, nextChapter, page, current, verses, key, activeVerse } = reading
  const { bookmarked, savedVerses, isVerseSaved } = bookmarks
  const { openChapter, openSavedVerse, toggleSavedVerse, toggleChapterBookmark, activateVerse, previousPage, nextPage, retryVerses, recoverGrammar } = actions
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [tab, setTab] = useState<ChapterView>('chapters')
  const visibleChapters = chapters.filter(item => `${item.name} ${item.meaning} ${item.id}`.toLowerCase().includes(query.toLowerCase()))

  return <main className="quran-reader grid min-h-screen bg-ui-background font-ui-body text-ui-foreground lg:grid-cols-[14rem_minmax(0,1fr)] [&_button]:scroll-mb-28">
    <ReaderSidebar onBookmarks={() => setTab('bookmarks')}/>
    <section className="min-w-0">
      <ReaderTopbar searchOpen={searchOpen} searchRef={searchToggle} onToggleSearch={() => setSearchOpen(!searchOpen)}/>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-6 pb-28 sm:px-8 lg:grid-cols-2 lg:py-8">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <ReaderWelcome/>
          <ChapterShortcut onOpen={() => openChapter(2)}/>
          <ChapterBrowser total={chapters.length} tab={tab} onTabChange={setTab} bookmarkCount={bookmarks.count}
            search={searchOpen && <ChapterSearch query={query} onQueryChange={setQuery} onClose={() => { setSearchOpen(false); setQuery(''); searchToggle.current?.focus() }}/>}
          >
            {tab === 'chapters'
              ? <ChapterList chapters={visibleChapters} selectedId={selected} onSelect={openChapter}/>
              : <BookmarkList chapters={chapters} bookmarkedChapter={bookmarked ? chapter : null} savedVerses={savedVerses} onOpenChapter={openChapter}
                  onOpenVerse={openSavedVerse}/>
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
            <Button variant="ghost" size="icon" aria-label="Bookmark this chapter" aria-pressed={bookmarked} onClick={toggleChapterBookmark}><Icon name="bookmark"/></Button>
          </div>
          <div className="surah-heading mt-[18px] mb-[11px] flex items-center gap-3 whitespace-nowrap text-ui-muted"><div className="h-px flex-1 bg-ui-border"/><span translate="no" lang="ar" dir="rtl">سُورَةُ {chapter.arabic}</span><div className="h-px flex-1 bg-ui-border"/></div>{selected !== 1 && selected !== 9 && page === 1 && <div className="bismillah" translate="no" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>}<div className="verse-list max-h-[540px] overflow-auto [scrollbar-color:var(--theme-border)_transparent] [scrollbar-width:thin] max-[760px]:max-h-none min-[761px]:[@media(max-height:900px)]:max-h-[450px]" aria-busy={current.status === 'loading'}>
          {current.status === 'loading' && <p role="status">Loading verses…</p>}
          {current.status === 'error' && <div><p role="alert">{current.message}</p><Button onClick={retryVerses}>Retry verses</Button></div>}
          {current.status === 'ready' && <p className="px-4 text-[.85rem] leading-[1.5]">{current.data.translationName} · Quran Foundation</p>}
          {verses.map(verse => <VerseView key={`${key}-${verse.number}`} verse={verse} chapter={chapter} active={activeVerse === verse.number} saved={isVerseSaved(verse)}
            onBookmark={() => toggleSavedVerse(verse)} onActivate={() => activateVerse(verse.number)} readingFocusRef={readingHeading} onGrammarRecovered={recoverGrammar}/>)}</div><div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
          <Button variant="outline" disabled={page === 1} onClick={previousPage}>Previous verses</Button>
          <span>Page {page}</span>
          <Button variant="outline" disabled={current.status !== 'ready' || current.data.nextPage === null} onClick={nextPage}>Next verses</Button>
        </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-0 border-t border-solid border-ui-border pt-4">
            <Button variant="ghost" className="min-w-0 flex-1 basis-40" disabled={!previousChapter} onClick={() => { if (previousChapter) openChapter(previousChapter.id) }}><Icon name="back" size={17}/><span className="min-w-0 text-left wrap-anywhere"><span className="block text-xs whitespace-nowrap">PREVIOUS</span>{previousChapter?.name ?? 'Beginning'}</span></Button>
            <Button variant="ghost" className="min-w-0 flex-1 basis-40" disabled={!nextChapter} onClick={() => { if (nextChapter) openChapter(nextChapter.id) }}><span className="min-w-0 text-right wrap-anywhere"><span className="block text-xs whitespace-nowrap">NEXT</span>{nextChapter?.name ?? 'End of Quran'}</span><Icon name="next" size={17}/></Button>
          </div>
        </aside>
      </div>
      <ReaderMobileNav onExplore={() => setSearchOpen(true)} onBookmarks={() => setTab('bookmarks')}/>
    </section>
  </main>
}
