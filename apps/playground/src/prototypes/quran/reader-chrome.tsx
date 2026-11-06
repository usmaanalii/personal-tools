import type { ReactNode, Ref } from 'react'
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

export function ReaderTopbar({ searchOpen, onToggleSearch, searchRef, children }: {
  searchOpen: boolean
  onToggleSearch: () => void
  searchRef: Ref<HTMLButtonElement>
  readonly children: ReactNode
}) {
  return <header className="flex min-h-16 items-center justify-between border-0 border-b border-solid border-ui-border bg-ui-surface px-4 py-2 sm:px-8">
    <nav aria-label="Reader controls" className="flex w-full items-center justify-between gap-2">
      {children}
      <Button variant="ghost" size="icon" ref={searchRef} aria-label="Search chapters" aria-expanded={searchOpen} aria-controls={searchOpen ? 'chapter-search' : undefined} onClick={onToggleSearch}><Icon name="search"/></Button>
    </nav>
  </header>
}

export function ReaderWelcome() {
  return <h1 className="m-0 font-ui-heading text-lg leading-tight font-semibold sm:text-xl">A moment with the Quran<span className="text-ui-primary">.</span></h1>
}

export function ChapterShortcut({ onOpen }: { onOpen: () => void }) {
  return <Button variant="outline" className="self-start justify-start" aria-label="Open Al-Baqarah · Chapter 2" onClick={onOpen}>Al-Baqarah · Chapter 2 <span aria-hidden="true">→</span></Button>
}
