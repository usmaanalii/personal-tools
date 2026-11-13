import type { ReactNode } from 'react'

export function ReadingPanel({ header, ornament, footer, busy, children }: {
  readonly header: ReactNode
  readonly ornament?: ReactNode
  readonly footer?: ReactNode
  readonly busy: boolean
  readonly children: ReactNode
}) {
  return <section aria-label="Current chapter" aria-busy={busy}>
    <header className="flex min-h-11 items-start justify-between gap-3 border-0 border-b border-solid border-ui-border pb-2">{header}</header>
    {ornament}
    <section aria-label="Verses" aria-busy={busy} className="verse-list">{children}</section>
    {footer}
  </section>
}
