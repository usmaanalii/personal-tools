import type { ReactNode } from 'react'
import { ReaderMobileNav, ReaderSidebar } from './reader-chrome'
import './styles.css'

export function ReaderLayout({ children, topbar, onBookmarks, onExplore }: {
  readonly children: ReactNode
  readonly topbar: ReactNode
  readonly onBookmarks?: () => void
  readonly onExplore?: () => void
}) {
  return <main className="quran-reader grid min-h-screen bg-ui-background font-ui-body text-ui-foreground lg:grid-cols-[14rem_minmax(0,1fr)] [&_button]:scroll-mb-28">
    <div className="contents" inert={!onBookmarks}><ReaderSidebar onBookmarks={onBookmarks ?? (() => {})}/></div>
    <section className="min-w-0">
      {topbar}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-6 pb-28 sm:px-8 lg:grid-cols-2 lg:py-8">
        {children}
        <section aria-labelledby="reader-sources" className="order-3 min-w-0 text-sm leading-relaxed text-ui-muted wrap-anywhere lg:col-span-2">
          <h2 id="reader-sources" className="mt-0 mb-2 text-base font-semibold">Sources</h2>
          <p className="m-0">Grammar · <a className="underline" href="https://corpus.quran.com/">Quranic Arabic Corpus v0.4</a>. Text · <a className="underline" href="https://tanzil.net/">Tanzil</a>. <a className="underline" href={`${import.meta.env.BASE_URL}quran-data/NOTICE.txt`}>Data notices</a>.</p>
        </section>
      </div>
      <div inert={!onExplore}><ReaderMobileNav onExplore={onExplore ?? (() => {})} onBookmarks={onBookmarks ?? (() => {})}/></div>
    </section>
  </main>
}
