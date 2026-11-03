import type { Ref } from 'react'
import { Button } from '@scratch-pages/ui'
import { Icon } from './reader-icon'

export function ReaderSidebar({ onBookmarks }: { onBookmarks: () => void }) {
  return <aside aria-label="Reader navigation" className="sticky top-0 hidden h-screen flex-col gap-3 border-0 border-r border-solid border-ui-border bg-ui-surface p-6 lg:flex">
    <div className="mb-8 flex items-center gap-3 font-ui-heading text-xl font-extrabold tracking-widest">
      <span aria-hidden="true" className="text-3xl text-ui-primary">۞</span> NOOR.
    </div>
    <p className="m-0 text-xs font-bold tracking-widest text-ui-muted">YOUR SPACE</p>
    <Button variant="ghost"><Icon name="home" size={18}/> Read Quran</Button>
    <Button variant="ghost" onClick={onBookmarks}><Icon name="bookmark" size={18}/> Bookmarks</Button>
    <div className="mt-auto">
      <p className="text-xs font-bold tracking-widest text-ui-muted">DAILY READING</p>
      <div className="rounded-ui-card bg-ui-background p-4">
        <strong className="text-sm">Keep your rhythm</strong>
        <p className="text-sm leading-relaxed text-ui-muted">A little reading each day goes a long way.</p>
        <div aria-hidden="true" className="flex justify-between text-xs text-ui-muted">M · T · W · T · F · S · S</div>
      </div>
      <div className="mt-6 border-0 border-t border-solid border-ui-border pt-4 text-sm">
        <b className="block">As-salāmu ʿalaykum</b><span className="text-ui-muted">Your reading space</span>
      </div>
    </div>
  </aside>
}

export function ReaderTopbar({ searchOpen, onToggleSearch, searchRef }: {
  searchOpen: boolean
  onToggleSearch: () => void
  searchRef: Ref<HTMLButtonElement>
}) {
  return <header className="flex items-center justify-between border-0 border-b border-solid border-ui-border bg-ui-surface px-4 py-2 sm:px-8">
    <span className="text-xs font-bold tracking-widest text-ui-muted">QURAN / READ</span>
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" ref={searchRef} aria-label="Search chapters" aria-expanded={searchOpen} aria-controls={searchOpen ? 'chapter-search' : undefined} onClick={onToggleSearch}><Icon name="search"/></Button>
      <Button variant="ghost" size="icon" aria-label="Settings" className="hidden sm:inline-flex"><Icon name="settings"/></Button>
    </div>
  </header>
}

export function ReaderWelcome() {
  return <div className="flex items-center justify-between gap-4">
    <div>
      <p className="m-0 text-xs font-bold tracking-widest text-ui-muted">WEDNESDAY, 29 OCTOBER</p>
      <h1 className="mt-2 mb-0 font-ui-heading text-2xl leading-tight font-semibold sm:text-3xl">A moment with the Quran<span className="text-ui-primary">.</span></h1>
      <p className="mt-3 mb-0 text-sm leading-relaxed text-ui-muted">Find a little stillness in the words that matter.</p>
    </div>
    <span aria-hidden="true" className="text-4xl text-ui-primary">۞</span>
  </div>
}

export function ChapterShortcut({ onOpen }: { onOpen: () => void }) {
  return <div className="relative overflow-hidden rounded-ui-card bg-ui-primary p-6 text-ui-on-primary shadow-ui-card">
    <p className="m-0 text-xs font-bold tracking-widest">EXPLORE THE QURAN</p>
    <p className="my-3 text-xl font-semibold">Al-Baqarah · Chapter 2</p>
    <p className="my-3 text-sm">Read at your own pace</p>
    <Button variant="outline" onClick={onOpen}>Open Al-Baqarah <span aria-hidden="true">→</span></Button>
    <span aria-hidden="true" className="card-arabic">البقرة</span>
  </div>
}

export function ReaderMobileNav({ onExplore, onBookmarks }: { onExplore: () => void; onBookmarks: () => void }) {
  return <nav aria-label="Reader shortcuts" className="fixed inset-x-0 bottom-0 z-10 flex justify-around gap-2 border-0 border-t border-solid border-ui-border bg-ui-surface px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
    <Button variant="ghost" size="compact" className="flex-col" ><Icon name="home" size={19}/><span>Read</span></Button>
    <Button variant="ghost" size="compact" className="flex-col" onClick={onExplore}><Icon name="search" size={19}/><span>Explore</span></Button>
    <Button variant="ghost" size="compact" className="flex-col" onClick={onBookmarks}><Icon name="bookmark" size={19}/><span>Saved</span></Button>
    <Button variant="ghost" size="compact" className="flex-col"><Icon name="settings" size={19}/><span>More</span></Button>
  </nav>
}
