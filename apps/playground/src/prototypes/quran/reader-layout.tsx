import type { ReactNode } from 'react'
import './styles.css'

export function ReaderLayout({ children, navigation }: {
  readonly children: ReactNode
  readonly navigation?: ReactNode
}) {
  return <div className="quran-reader min-h-dvh bg-ui-surface font-ui-body text-ui-foreground">
    {navigation}
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-8 sm:py-5">
        {children}
        <footer className="mt-4 space-y-3 text-sm leading-relaxed text-ui-muted wrap-anywhere">
          <section aria-labelledby="reader-sources">
            <h2 id="reader-sources" className="mt-0 mb-1 text-base font-semibold">Sources</h2>
            <p className="m-0">Grammar · <a className="underline" href="https://corpus.quran.com/">Quranic Arabic Corpus v0.4</a>. Text · <a className="underline" href="https://tanzil.net/">Tanzil</a>. <a className="underline" href={`${import.meta.env.BASE_URL}quran-data/NOTICE.txt`}>Data notices</a>.</p>
          </section>
          <a className="inline-flex min-h-11 items-center underline" href={import.meta.env.BASE_URL}>All playground pages</a>
        </footer>
    </main>
  </div>
}
