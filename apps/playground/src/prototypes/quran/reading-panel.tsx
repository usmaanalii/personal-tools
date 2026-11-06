import type { ReactNode } from 'react'

/** The loading and populated reader share every layout constraint. */
export function ReadingPanel({ header, ornament, footer, busy, children }: {
  readonly header: ReactNode
  readonly ornament: ReactNode
  readonly footer: ReactNode
  readonly busy: boolean
  readonly children: ReactNode
}) {
  return <aside aria-label="Current chapter" aria-busy={busy} className="order-2 min-w-0 self-start rounded-ui-card border border-solid border-ui-border bg-ui-surface p-4 shadow-ui-card sm:p-6 lg:order-none">
    <div className="flex min-h-28 items-start justify-between gap-3 border-0 border-b border-solid border-ui-border pb-4">{header}</div>
    <div className="flex h-24 flex-col justify-center">{ornament}</div>
    {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard readers need a focus target to scroll the verse region. */}
    <section aria-label="Verses" tabIndex={0} aria-busy={busy} className="verse-list h-[clamp(20rem,60svh,33.75rem)] overflow-auto [scrollbar-gutter:stable] [scrollbar-color:var(--theme-border)_transparent] [scrollbar-width:thin] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-ui-focus">{children}</section>
    {footer}
  </aside>
}
