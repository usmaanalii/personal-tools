import type { Chapter } from './quran-api'

type ChapterListProps = {
  chapters: readonly Chapter[]
  selectedId: number
  onSelect: (id: number) => void
}

export function ChapterChoice({ chapter, selected, onSelect }: { chapter: Chapter; selected: boolean; onSelect: (id: number) => void }) {
  return <button type="button" aria-current={selected ? 'true' : undefined} onClick={() => onSelect(chapter.id)}
    className="grid min-h-16 w-full cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-ui-control border-0 border-b border-solid border-ui-border bg-transparent px-2 py-2 text-left font-ui-body text-ui-foreground hover:bg-ui-background aria-current:bg-ui-background focus-visible:outline-3 focus-visible:outline-solid focus-visible:-outline-offset-3 focus-visible:outline-ui-focus sm:grid-cols-[2rem_minmax(0,1fr)_auto_auto] sm:py-3">
    <span className="text-center text-sm text-ui-muted">{chapter.id}</span>
    <span className="min-w-0 wrap-anywhere"><b className="block text-base font-semibold">{chapter.name}</b><span className="mt-1 block text-sm text-ui-muted">{chapter.meaning} · {chapter.place}</span></span>
    <span className="chapter-arabic col-start-2 row-start-2 text-ui-primary sm:col-auto sm:row-auto" translate="no" lang="ar" dir="rtl">{chapter.arabic}</span>
    <span className="col-start-3 row-start-1 text-right text-sm text-ui-muted sm:col-auto sm:row-auto">{chapter.verses}<span className="block text-xs">VERSES</span></span>
  </button>
}

/** Renders chapter choices from app-owned data; selection and loading stay in Reader. */
export function ChapterList({ chapters, selectedId, onSelect }: ChapterListProps) {
  if (chapters.length === 0) return <p className="m-0 p-6 text-sm leading-relaxed text-ui-muted" role="status">No chapters match this search. Try another search.</p>
  return <>{chapters.map(chapter => <ChapterChoice key={chapter.id} chapter={chapter} selected={selectedId === chapter.id} onSelect={onSelect}/>)}</>
}
