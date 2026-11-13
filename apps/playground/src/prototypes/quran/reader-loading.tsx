import { Skeleton } from '@scratch-pages/ui'
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
  return <ReaderLayout>
    {!failure && <p role="status" className="sr-only">{message}</p>}
    <ReadingPanel busy={!failure} header={<h1 className="m-0 font-ui-heading text-xl font-semibold">Quran reader</h1>}>
      {failure ? <ChapterRequestStatus failed message={failure.message} onRetry={failure.onRetry}/> : <VerseSkeleton/>}
    </ReadingPanel>
  </ReaderLayout>
}
