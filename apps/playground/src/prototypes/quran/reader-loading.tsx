import { Skeleton, ViewSwitcher } from '@scratch-pages/ui'
import { ChapterShortcut, ReaderWelcome } from './reader-chrome'
import { ReaderLayout } from './reader-layout'
import { ReadingPanel } from './reading-panel'
import { ChapterRequestStatus } from './chapter-browser'

export function VerseSkeleton() {
  return <div aria-hidden="true" className="space-y-6 p-4">
    {[1, 2, 3].map(row => <div key={row} className="space-y-3 border-0 border-b border-solid border-ui-border pb-6">
      <Skeleton className="ml-auto h-8 w-5/6"/>
      <Skeleton className="ml-auto h-8 w-2/3"/>
      <Skeleton className="h-4 w-full"/>
      <Skeleton className="h-4 w-3/4"/>
    </div>)}
  </div>
}

export function ReaderLoading({ message = 'Loading chapters…', failure }: {
  readonly message?: string
  readonly failure?: { readonly message: string; readonly onRetry: () => void }
}) {
  return <ReaderLayout topbar={<header className="flex min-h-16 items-center justify-between border-0 border-b border-solid border-ui-border bg-ui-surface px-4 py-2 sm:px-8">
    <a href={import.meta.env.BASE_URL} className="text-xs font-bold text-ui-primary underline">← All playground pages</a>
    <div className="h-11 w-11">{!failure && <Skeleton className="h-full w-full"/>}</div>
  </header>}>
    <h2 className="sr-only">Quran reader</h2>
    {!failure && <p role="status" className="sr-only">{message}</p>}
    <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
      <ReaderWelcome/>
      <div className="contents" inert><ChapterShortcut onOpen={() => {}}/></div>
      <section aria-label="Chapter browsing" aria-busy={!failure} className="order-3 min-w-0 lg:order-none">
        <h2 className="mt-0 mb-4 font-ui-heading text-xl font-semibold">Chapters</h2>
        <div inert><ViewSwitcher label="Chapter views" value="chapters" onValueChange={() => {}} options={[{ value: 'chapters', label: 'All chapters' }, { value: 'bookmarks', label: <>My bookmarks <span>0</span></> }]}/></div>
        <div className="h-24 pt-4">{!failure && <Skeleton className="h-4 w-1/3"/>}</div>
        <div aria-hidden="true" className="h-96 space-y-4 overflow-hidden p-1">{!failure && [1, 2, 3, 4].map(row => <Skeleton key={row} className="h-20 w-full"/>)}</div>
      </section>
    </div>
    <ReadingPanel busy={!failure} header={failure ? <h2 className="m-0 font-ui-heading text-xl font-semibold">Quran content unavailable</h2> : <div className="w-full space-y-3"><Skeleton className="h-4 w-24"/><Skeleton className="h-7 w-1/2"/><Skeleton className="h-5 w-3/4"/></div>}
      ornament={!failure && <Skeleton className="mx-auto h-5 w-1/3"/>}
      footer={<><div className="flex h-24 items-center py-4">{!failure && <Skeleton className="h-11 w-full"/>}</div><div className="flex h-24 items-center border-0 border-t border-solid border-ui-border pt-4">{!failure && <Skeleton className="h-11 w-full"/>}</div></>}>
      {failure ? <ChapterRequestStatus failed message={failure.message} onRetry={failure.onRetry}/> : <VerseSkeleton/>}
    </ReadingPanel>
  </ReaderLayout>
}
