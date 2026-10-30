import { useEffect, useState, type ReactNode } from 'react'
import './styles.css'
import { getChapters, getVerses, type Chapter, type Ayah, type VersePage } from './quran-api'

type SavedVerse = { chapterId: number; verse: Ayah }

type IconName = 'search' | 'bookmark' | 'back' | 'next' | 'play' | 'more' | 'list' | 'home' | 'settings'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, bookmark: <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4z"/>,
    back: <><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></>, next: <><path d="m9 18 6-6-6-6"/><path d="M15 12H3"/></>,
    play: <><path d="m8 5 12 7-12 7z"/></>, more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>, home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
    settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1 1.1.9-1.2 2-1.4-.6a8 8 0 0 1-1.4.8l-.2 1.5h-2.4l-.3-1.5a8 8 0 0 1-1.5-.6l-1.3.8-1.7-1.7.8-1.3a8 8 0 0 1-.6-1.5l-1.5-.3v-2.4l1.5-.3a8 8 0 0 1 .6-1.5l-.8-1.3 1.7-1.7 1.3.8a8 8 0 0 1 1.5-.6l.3-1.5h2.4l.2 1.5a8 8 0 0 1 1.4.8l1.4-.6 1.2 2-1.1.9a8 8 0 0 1 0 2Z"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

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
  if (state.status === 'loading') return <main className="reader-message" aria-busy="true"><p role="status">Loading chapters…</p></main>
  if (state.status === 'error') return <main className="reader-message"><p role="alert">{state.message}</p><button type="button" onClick={retry}>Retry chapters</button></main>
  return <Reader chapters={state.chapters}/>
}

type VersesState = { key: string; status: 'loading' } | { key: string; status: 'error'; message: string } | { key: string; status: 'ready'; data: VersePage }
function Reader({ chapters }: { chapters: [Chapter, ...Chapter[]] }) {
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
  const [tab, setTab] = useState<'chapters' | 'bookmarks'>('chapters')
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

  return <main className="reader-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">۞</span><span>NOOR<span className="brand-dot">.</span></span></div>
      <div className="side-label">YOUR SPACE</div>
      <button type="button" className="side-link active"><Icon name="home" size={18}/> Read Quran</button>
      <button type="button" className="side-link" onClick={() => setTab('bookmarks')}><Icon name="bookmark" size={18}/> Bookmarks</button>
      <div className="sidebar-bottom"><div className="side-label">DAILY READING</div><div className="streak-card"><span className="streak-icon">✦</span><strong>Keep your rhythm</strong><p>A little reading each day goes a long way.</p><div className="streak-days"><b> M </b><b> T </b><b> W </b><b> T </b><b> F </b><b> S </b><b> S </b></div></div><div className="profile"><div className="avatar">A</div><div><b>As-salāmu ʿalaykum</b><small>Your reading space</small></div><Icon name="more" size={19}/></div></div>
    </aside>
    <section className="main-pane">
      <header className="topbar"><div className="crumb">QURAN <span>/</span> READ</div><div className="top-actions"><button type="button" className="icon-button search-toggle" aria-label="Search chapters" onClick={() => setSearchOpen(!searchOpen)}><Icon name="search"/></button><button type="button" className="icon-button" aria-label="Settings"><Icon name="settings"/></button><div className="avatar small">A</div></div></header>
      <div className="content-layout">
        <section className="reading-column">
          <div className="welcome-line"><div><div className="eyebrow">WEDNESDAY, 29 OCTOBER</div><h1>A moment with the Quran<span>.</span></h1><p className="subhead">Find a little stillness in the words that matter.</p></div><div className="ornament">۞</div></div>
          <div className="continue-card"><div className="continue-glow"/><div className="continue-content"><div className="eyebrow light">EXPLORE THE QURAN</div><div className="continue-title">Al-Baqarah <span>·</span> Chapter 2</div><div className="continue-meta">Read at your own pace</div><button type="button" className="continue-button" onClick={() => openChapter(2)}>Open Al-Baqarah <span>→</span></button></div><div className="card-arabic">البقرة</div></div>
          <div className="section-heading"><div><div className="eyebrow">THE HOLY QURAN</div><h2>Chapters <span className="chapter-total">{chapters.length}</span></h2></div><button type="button" className="sort-button"><Icon name="list" size={17}/> All chapters <span>⌄</span></button></div>
          <div className="tabs"><button type="button" className={tab === 'chapters' ? 'tab selected' : 'tab'} onClick={() => setTab('chapters')}>All chapters</button><button type="button" className={tab === 'bookmarks' ? 'tab selected' : 'tab'} onClick={() => setTab('bookmarks')}>My bookmarks <span className="tab-count">{savedVerses.length + (bookmarked ? 1 : 0)}</span></button></div>
          {/* biome-ignore lint/a11y/noAutofocus: Search opens on explicit user request and immediately accepts typing. */}
          {searchOpen && <div className="search-field"><Icon name="search" size={17}/><input aria-label="Search chapters" autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by chapter or meaning…"/><button type="button" aria-label="Close search" onClick={() => { setSearchOpen(false); setQuery('') }}>×</button></div>}
          <div className="chapter-list">
            {tab === 'chapters' ? visibleChapters.map(item => <button type="button" key={item.id} className={`chapter-row ${selected === item.id ? 'chapter-active' : ''}`} onClick={() => openChapter(item.id)}><span className="chapter-number"><span>{item.id}</span></span><span className="chapter-info"><b>{item.name}</b><small>{item.meaning} <i/> {item.place}</small></span><span className="chapter-arabic" translate="no" lang="ar" dir="rtl">{item.arabic}</span><span className="chapter-verses">{item.verses}<small>VERSES</small></span></button>) : <>
              {bookmarked && <button type="button" className="chapter-row" onClick={() => openChapter(selected)}><span className="chapter-number"><span>{chapter.id}</span></span><span className="chapter-info"><b>{chapter.name}</b><small>{chapter.meaning} <i/> {chapter.place}</small></span><span className="chapter-arabic" translate="no" lang="ar" dir="rtl">{chapter.arabic}</span><span className="chapter-verses">{chapter.verses}<small>VERSES</small></span></button>}
              {savedVerses.map(item => {
                const savedChapter = chapters.find(chapterItem => chapterItem.id === item.chapterId)
                if (!savedChapter) return null
                return <button type="button" key={`${item.chapterId}:${item.verse.number}`} className="saved-verse-row" aria-label={`${savedChapter.name} ${item.chapterId}:${item.verse.number}`} onClick={() => { openChapter(item.chapterId, item.verse.number); setActiveVerse(item.verse.number) }}><span className="saved-verse-reference">{savedChapter.name} {item.chapterId}:{item.verse.number}</span><span className="saved-verse-translation">{item.verse.translation}</span></button>
              })}
              {!bookmarked && savedVerses.length === 0 && <div className="empty-state">Your saved verses will find a home here.</div>}
            </>}
          </div>
        </section>
        <aside className="verse-panel"><div className="panel-top"><div><div className="eyebrow">NOW READING</div><h2>{chapter.name}</h2><p>{chapter.meaning} <i/> {chapter.place} <i/> {chapter.verses} verses</p></div><button type="button" className={`icon-button ${bookmarked ? 'saved' : ''}`} aria-label="Bookmark this chapter" aria-pressed={bookmarked} onClick={() => setBookmarked(!bookmarked)}><Icon name="bookmark"/></button></div><div className="surah-heading"><div className="surah-line"/><span translate="no" lang="ar" dir="rtl">سُورَةُ {chapter.arabic}</span><div className="surah-line"/></div>{selected !== 1 && selected !== 9 && page === 1 && <div className="bismillah" translate="no" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>}<div className="verse-list" aria-busy={current.status === 'loading'}>
          {current.status === 'loading' && <p role="status">Loading verses…</p>}
          {current.status === 'error' && <div><p role="alert">{current.message}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry verses</button></div>}
          {current.status === 'ready' && <p className="translation-credit">{current.data.translationName} · Quran Foundation</p>}{verses.map(verse => <article key={`${selected}-${verse.number}`} className={`verse ${activeVerse === verse.number ? 'verse-selected' : ''}`}><div className="verse-toolbar"><span className="verse-index"><span>۞</span> {selected}:{verse.number}</span><div><button type="button" aria-label="Audio coming soon" className="tiny-action" disabled><Icon name="play" size={16}/></button><button type="button" aria-label={`Bookmark verse ${verse.number}`} aria-pressed={isVerseSaved(verse)} className="tiny-action" onClick={event => { event.stopPropagation(); toggleSavedVerse(verse); setActiveVerse(verse.number) }}><Icon name="bookmark" size={16}/></button><button type="button" aria-label="More verse actions" className="tiny-action" onClick={event => { event.stopPropagation(); setActiveVerse(verse.number) }}><Icon name="more" size={17}/></button></div></div><p className="arabic-text" translate="no" lang="ar" dir="rtl">{verse.arabic}<span className="ayah-mark">۝{verse.number}</span></p><p className="translation">{verse.translation}</p></article>)}</div><div className="verse-pagination">
          <button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous verses</button>
          <span>Page {page}</span>
          <button type="button" disabled={current.status !== 'ready' || current.data.nextPage === null} onClick={() => { if (current.status === 'ready' && current.data.nextPage) setPage(current.data.nextPage) }}>Next verses</button>
        </div><div className="reader-footer"><button type="button" className="nav-chapter" disabled={chapterIndex === 0} onClick={() => openChapter(previousChapter.id)}><Icon name="back" size={17}/><span><small>PREVIOUS</small>{chapterIndex > 0 ? previousChapter.name : 'Beginning'}</span></button><span className="footer-divider"/><button type="button" className="nav-chapter next-chapter" disabled={chapterIndex === chapters.length - 1} onClick={() => openChapter(nextChapter.id)}><span><small>NEXT</small>{chapterIndex < chapters.length - 1 ? nextChapter.name : 'End of Quran'}</span><Icon name="next" size={17}/></button></div></aside>
      </div>
      <nav className="mobile-nav"><button type="button" className="mobile-active"><Icon name="home" size={19}/><span>Read</span></button><button type="button" onClick={() => setSearchOpen(true)}><Icon name="search" size={19}/><span>Explore</span></button><button type="button" onClick={() => setTab('bookmarks')}><Icon name="bookmark" size={19}/><span>Saved</span></button><button type="button"><Icon name="settings" size={19}/><span>More</span></button></nav>
    </section>
  </main>
}
