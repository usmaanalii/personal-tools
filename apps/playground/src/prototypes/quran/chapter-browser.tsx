import { useId, type ReactNode, type Ref } from 'react'
import { Button, Input, ViewSwitcher } from '@scratch-pages/ui'
import { ChapterChoice } from './chapter-list'
import type { Chapter } from './quran-api'
import type { SavedVerse } from './use-reader'

export type ChapterView = 'chapters' | 'bookmarks'

export function ChapterViews({ tab, onTabChange, bookmarkCount }: {
  tab: ChapterView
  onTabChange: (tab: ChapterView) => void
  bookmarkCount: number
}) {
  return <div className="[&_button]:px-2 [&_button]:text-sm"><ViewSwitcher<ChapterView> label="Chapter views" value={tab} onValueChange={onTabChange} options={[
    { value: 'chapters', label: 'Chapters' },
    { value: 'bookmarks', label: <>Bookmarks{bookmarkCount > 0 && <span> {bookmarkCount}</span>}</> },
  ]}/></div>
}

export function ChapterBrowser({ total, search, children, headingRef, tab = 'chapters' }: {
  total: number
  search: ReactNode
  children: ReactNode
  readonly headingRef?: Ref<HTMLHeadingElement>
  readonly tab?: ChapterView
}) {
  return <section aria-label="Chapter browsing" className="order-3 min-w-0 lg:order-none">
    <h2 ref={headingRef} tabIndex={-1} className="mt-0 mb-2 font-ui-heading text-xl font-semibold">{tab === 'chapters' ? 'Chapters' : 'Bookmarks'} <span className="ml-2 text-sm font-normal text-ui-muted">{total}</span></h2>
    {search && <div className="mb-3">{search}</div>}
    <div className="max-h-[60dvh] overflow-y-auto overscroll-contain p-1 [scrollbar-gutter:stable] lg:max-h-96">{children}</div>
  </section>
}

export function ChapterSearch({ query, onQueryChange, onClose }: { query: string; onQueryChange: (query: string) => void; onClose: () => void }) {
  const inputId = useId()
  return <div id="chapter-search">
    <label htmlFor={inputId} className="mb-2 block text-sm font-semibold">Search chapters</label>
    <div className="flex items-center gap-2">
      <Input id={inputId} autoFocus value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search by chapter or meaning…"/>
      <Button variant="outline" size="icon" aria-label="Close search" onClick={onClose}>×</Button>
    </div>
  </div>
}

export function BookmarkList({ chapters, bookmarkedChapter, savedVerses, onOpenChapter, onOpenVerse }: {
  chapters: readonly Chapter[]
  bookmarkedChapter: Chapter | null
  savedVerses: readonly SavedVerse[]
  onOpenChapter: (id: number) => void
  onOpenVerse: (chapterId: number, verseNumber: number) => void
}) {
  return <>
    {bookmarkedChapter && <ChapterChoice chapter={bookmarkedChapter} selected={false} onSelect={onOpenChapter}/>}
    {savedVerses.map(item => {
      const chapter = chapters.find(chapter => chapter.id === item.chapterId)
      if (!chapter) return null
      return <button type="button" key={`${item.chapterId}:${item.verse.number}`} aria-label={`${chapter.name} ${item.chapterId}:${item.verse.number}`} onClick={() => onOpenVerse(item.chapterId, item.verse.number)}
        className="block min-h-11 w-full cursor-pointer rounded-ui-control border-0 border-b border-solid border-ui-border bg-transparent p-4 text-left font-ui-body text-ui-foreground hover:bg-ui-background focus-visible:outline-3 focus-visible:outline-solid focus-visible:-outline-offset-3 focus-visible:outline-ui-focus">
        <span className="block text-base font-semibold wrap-anywhere">{chapter.name} {item.chapterId}:{item.verse.number}</span>
        <span className="mt-2 block text-sm leading-relaxed wrap-anywhere text-ui-muted">{item.verse.translation}</span>
      </button>
    })}
    {!bookmarkedChapter && savedVerses.length === 0 && <p className="m-0 p-6 text-sm leading-relaxed text-ui-muted">Your saved verses will find a home here.</p>}
  </>
}

export function ChapterRequestStatus({ message, failed = false, onRetry }: { message: string; failed?: boolean; onRetry?: () => void }) {
  return <div className="mx-auto max-w-xl p-6 leading-relaxed" aria-busy={!failed}>
    <p role={failed ? 'alert' : 'status'} className={failed ? 'text-ui-error' : 'text-ui-muted'}>{message}</p>
    {failed && <Button onClick={onRetry}>Retry chapters</Button>}
  </div>
}
