import { useMemo, useState, type ReactNode } from 'react'
import './styles.css'

type Chapter = { id: number; name: string; arabic: string; meaning: string; verses: number; place: 'Meccan' | 'Medinan' }
type Ayah = { number: number; arabic: string; translation: string }

const chapters: Chapter[] = [
  { id: 1, name: 'Al-Fātiḥah', arabic: 'الفاتحة', meaning: 'The Opening', verses: 7, place: 'Meccan' },
  { id: 2, name: 'Al-Baqarah', arabic: 'البقرة', meaning: 'The Cow', verses: 286, place: 'Medinan' },
  { id: 3, name: 'Āl ʿImrān', arabic: 'آل عمران', meaning: 'Family of Imran', verses: 200, place: 'Medinan' },
  { id: 4, name: 'An-Nisā', arabic: 'النساء', meaning: 'The Women', verses: 176, place: 'Medinan' },
  { id: 5, name: 'Al-Māʾidah', arabic: 'المائدة', meaning: 'The Table Spread', verses: 120, place: 'Medinan' },
  { id: 6, name: 'Al-Anʿām', arabic: 'الأنعام', meaning: 'The Cattle', verses: 165, place: 'Meccan' },
  { id: 7, name: 'Al-Aʿrāf', arabic: 'الأعراف', meaning: 'The Heights', verses: 206, place: 'Meccan' },
  { id: 8, name: 'Al-Anfāl', arabic: 'الأنفال', meaning: 'The Spoils of War', verses: 75, place: 'Medinan' },
  { id: 9, name: 'At-Tawbah', arabic: 'التوبة', meaning: 'The Repentance', verses: 129, place: 'Medinan' },
  { id: 10, name: 'Yūnus', arabic: 'يونس', meaning: 'Jonah', verses: 109, place: 'Meccan' },
  { id: 18, name: 'Al-Kahf', arabic: 'الكهف', meaning: 'The Cave', verses: 110, place: 'Meccan' },
  { id: 36, name: 'Yā-Sīn', arabic: 'يس', meaning: 'Ya Sin', verses: 83, place: 'Meccan' },
  { id: 55, name: 'Ar-Raḥmān', arabic: 'الرحمن', meaning: 'The Most Merciful', verses: 78, place: 'Medinan' },
  { id: 112, name: 'Al-Ikhlāṣ', arabic: 'الإخلاص', meaning: 'Sincerity', verses: 4, place: 'Meccan' },
]

const alFatihah: Ayah[] = [
  { number: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', translation: 'In the name of Allah—the Most Compassionate, Most Merciful.' },
  { number: 2, arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', translation: 'All praise is for Allah—Lord of all worlds,' },
  { number: 3, arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', translation: 'the Most Compassionate, Most Merciful,' },
  { number: 4, arabic: 'مَالِكِ يَوْمِ الدِّينِ', translation: 'Master of the Day of Judgment.' },
  { number: 5, arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', translation: 'You ˹alone˺ we worship and You ˹alone˺ we ask for help.' },
  { number: 6, arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', translation: 'Guide us along the Straight Path,' },
  { number: 7, arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', translation: 'the Path of those You have blessed—not those You are displeased with, or those who are astray.' },
]

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, bookmark: <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4z"/>,
    back: <><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></>, next: <><path d="m9 18 6-6-6-6"/><path d="M15 12H3"/></>,
    play: <><path d="m8 5 12 7-12 7z"/></>, more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>, home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
    settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1 1.1.9-1.2 2-1.4-.6a8 8 0 0 1-1.4.8l-.2 1.5h-2.4l-.3-1.5a8 8 0 0 1-1.5-.6l-1.3.8-1.7-1.7.8-1.3a8 8 0 0 1-.6-1.5l-1.5-.3v-2.4l1.5-.3a8 8 0 0 1 .6-1.5l-.8-1.3 1.7-1.7 1.3.8a8 8 0 0 1 1.5-.6l.3-1.5h2.4l.2 1.5a8 8 0 0 1 1.4.8l1.4-.6 1.2 2-1.1.9a8 8 0 0 1 0 2Z"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function App() {
  const [selected, setSelected] = useState(1)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [tab, setTab] = useState<'chapters' | 'bookmarks'>('chapters')
  const [activeVerse, setActiveVerse] = useState<number | null>(null)
  const chapter = chapters.find(item => item.id === selected) ?? chapters[0]!
  const visibleChapters = useMemo(() => chapters.filter(item => `${item.name} ${item.meaning} ${item.id}`.toLowerCase().includes(query.toLowerCase())), [query])
  const verses = selected === 1 ? alFatihah : [
    { number: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', translation: 'In the name of Allah—the Most Compassionate, Most Merciful.' },
    { number: 2, arabic: 'الم', translation: 'Alif-Lãm-Mĩm.' },
    { number: 3, arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ', translation: 'This is the Book! There is no doubt about it—a guide for those mindful ˹of Allah˺,' },
  ]
  const openChapter = (id: number) => { setSelected(id); setActiveVerse(null) }

  return <main className="reader-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">۞</span><span>NOOR<span className="brand-dot">.</span></span></div>
      <div className="side-label">YOUR SPACE</div>
      <button className="side-link active"><Icon name="home" size={18}/> Read Quran</button>
      <button className="side-link" onClick={() => setTab('bookmarks')}><Icon name="bookmark" size={18}/> Bookmarks</button>
      <div className="sidebar-bottom"><div className="side-label">DAILY READING</div><div className="streak-card"><span className="streak-icon">✦</span><strong>Keep your rhythm</strong><p>A little reading each day goes a long way.</p><div className="streak-days"><b> M </b><b> T </b><b> W </b><b> T </b><b> F </b><b> S </b><b> S </b></div></div><div className="profile"><div className="avatar">A</div><div><b>As-salāmu ʿalaykum</b><small>Your reading space</small></div><Icon name="more" size={19}/></div></div>
    </aside>
    <section className="main-pane">
      <header className="topbar"><div className="crumb">QURAN <span>/</span> READ</div><div className="top-actions"><button className="icon-button search-toggle" aria-label="Search chapters" onClick={() => setSearchOpen(!searchOpen)}><Icon name="search"/></button><button className="icon-button" aria-label="Settings"><Icon name="settings"/></button><div className="avatar small">A</div></div></header>
      <div className="content-layout">
        <section className="reading-column">
          <div className="welcome-line"><div><div className="eyebrow">WEDNESDAY, 29 OCTOBER</div><h1>A moment with the Quran<span>.</span></h1><p className="subhead">Find a little stillness in the words that matter.</p></div><div className="ornament">۞</div></div>
          <div className="continue-card"><div className="continue-glow"/><div className="continue-content"><div className="eyebrow light">PICK UP WHERE YOU LEFT OFF</div><div className="continue-title">Al-Baqarah <span>·</span> 2:18</div><div className="continue-meta">Juz 1 <i/> 3 min read</div><button className="continue-button" onClick={() => openChapter(2)}>Continue reading <span>→</span></button></div><div className="progress-ring"><div><b>12%</b><small>complete</small></div></div><div className="card-arabic">البقرة</div></div>
          <div className="section-heading"><div><div className="eyebrow">THE HOLY QURAN</div><h2>Chapters <span className="chapter-total">114</span></h2></div><button className="sort-button"><Icon name="list" size={17}/> All chapters <span>⌄</span></button></div>
          <div className="tabs"><button className={tab === 'chapters' ? 'tab selected' : 'tab'} onClick={() => setTab('chapters')}>All chapters</button><button className={tab === 'bookmarks' ? 'tab selected' : 'tab'} onClick={() => setTab('bookmarks')}>My bookmarks <span className="tab-count">{bookmarked ? 1 : 0}</span></button></div>
          {searchOpen && <label className="search-field"><Icon name="search" size={17}/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by chapter or meaning…"/><button aria-label="Close search" onClick={() => { setSearchOpen(false); setQuery('') }}>×</button></label>}
          <div className="chapter-list">{(tab === 'bookmarks' ? (bookmarked ? chapters.filter(item => item.id === selected) : []) : visibleChapters).map(item => <button key={item.id} className={`chapter-row ${selected === item.id ? 'chapter-active' : ''}`} onClick={() => openChapter(item.id)}><span className="chapter-number"><span>{item.id}</span></span><span className="chapter-info"><b>{item.name}</b><small>{item.meaning} <i/> {item.place}</small></span><span className="chapter-arabic">{item.arabic}</span><span className="chapter-verses">{item.verses}<small>VERSES</small></span></button>)}{tab === 'bookmarks' && !bookmarked && <div className="empty-state">Your saved verses will find a home here.</div>}</div>
        </section>
        <aside className="verse-panel"><div className="panel-top"><div><div className="eyebrow">NOW READING</div><h2>{chapter.name}</h2><p>{chapter.meaning} <i/> {chapter.place} <i/> {chapter.verses} verses</p></div><button className={`icon-button ${bookmarked ? 'saved' : ''}`} aria-label="Bookmark this chapter" onClick={() => setBookmarked(!bookmarked)}><Icon name="bookmark"/></button></div><div className="surah-heading"><div className="surah-line"/><span>سُورَةُ {chapter.arabic}</span><div className="surah-line"/></div>{selected !== 1 && <div className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>}<div className="verse-list">{verses.map(verse => <article key={`${selected}-${verse.number}`} className={`verse ${activeVerse === verse.number ? 'verse-selected' : ''}`} onClick={() => setActiveVerse(activeVerse === verse.number ? null : verse.number)}><div className="verse-toolbar"><span className="verse-index"><span>۞</span> {selected}:{verse.number}</span><div><button aria-label={`Play verse ${verse.number}`} className={`tiny-action ${playing && activeVerse === verse.number ? 'playing' : ''}`} onClick={event => { event.stopPropagation(); setActiveVerse(verse.number); setPlaying(!playing) }}><Icon name="play" size={16}/></button><button aria-label={`Bookmark verse ${verse.number}`} className="tiny-action" onClick={event => { event.stopPropagation(); setBookmarked(!bookmarked); setActiveVerse(verse.number) }}><Icon name="bookmark" size={16}/></button><button aria-label="More verse actions" className="tiny-action" onClick={event => { event.stopPropagation(); setActiveVerse(verse.number) }}><Icon name="more" size={17}/></button></div></div><p className="arabic-text" lang="ar" dir="rtl">{verse.arabic}<span className="ayah-mark">۝{verse.number}</span></p><p className="translation">{verse.translation}</p></article>)}</div><div className="reader-footer"><button className="nav-chapter" onClick={() => openChapter(Math.max(1, selected - 1))}><Icon name="back" size={17}/><span><small>PREVIOUS</small>{selected > 1 ? chapters.find(item => item.id === selected - 1)?.name ?? 'Al-Fātiḥah' : 'Beginning'}</span></button><span className="footer-divider"/><button className="nav-chapter next-chapter" onClick={() => openChapter(Math.min(114, selected + 1))}><span><small>NEXT</small>{chapters.find(item => item.id === selected + 1)?.name ?? 'Continue'}</span><Icon name="next" size={17}/></button></div></aside>
      </div>
      <nav className="mobile-nav"><button className="mobile-active"><Icon name="home" size={19}/><span>Read</span></button><button onClick={() => setSearchOpen(true)}><Icon name="search" size={19}/><span>Explore</span></button><button onClick={() => setTab('bookmarks')}><Icon name="bookmark" size={19}/><span>Saved</span></button><button><Icon name="settings" size={19}/><span>More</span></button></nav>
    </section>
  </main>
}
