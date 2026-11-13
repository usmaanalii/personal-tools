import { useState } from 'react'
import { availabilitySnapshots } from './word-availability-snapshots'
import '../../app/home.css'
import './styles.css'

const sources = ['Corpus', 'Lane', 'Mufradāt'] as const
const filled = '●'
const hollow = '○'

type CapturedWord = typeof availabilitySnapshots[number]['words'][number]

const isAvailable = {
  lexical: true,
  grammar_only: true,
  indexed: true,
  multiple: true,
  missing: false,
  unknown: false,
  temporarily_unavailable: false,
} satisfies Record<CapturedWord[1 | 2 | 3], boolean>

export default function WordAvailabilityPreview() {
  const [selected, setSelected] = useState<{ reference: string; position: number; description: string } | null>(null)
  return <main className="playground-shell mx-auto min-h-dvh max-w-[48rem] px-4 py-8 font-ui-body text-ui-foreground sm:px-8">
    <a className="inline-flex min-h-11 items-center text-ui-primary focus-visible:outline-3 focus-visible:outline-ui-focus" href={import.meta.env.BASE_URL}>← All playground pages</a>
    <h1 className="mt-4 mb-2 font-ui-heading text-3xl font-bold">Quran word availability</h1>
    <p className="mt-0 mb-2 text-sm text-ui-muted">Left to right: {sources.join(', ')}.</p>
    <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ui-muted">
      <span>{filled} Available</span>
      <span>{hollow} Unavailable</span>
    </div>
    <div className="verse-list grid gap-4">
      {availabilitySnapshots.map(snapshot => <section key={snapshot.reference} aria-label={snapshot.heading} className="rounded-ui-card border border-ui-border bg-ui-surface p-3 sm:p-5">
        <h2 className="m-0 font-ui-heading text-lg font-semibold">{snapshot.heading}</h2>
        <p className="arabic-text" lang="ar" dir="rtl" translate="no">
          {snapshot.words.map(([arabic, corpus, lane, mufradat], index) => {
            const position = index + 1
            const id = `word-source-${snapshot.reference}:${position}`
            const availability = [isAvailable[corpus], isAvailable[lane], isAvailable[mufradat]]
            const description = sources.map((source, sourceIndex) => `${source}: ${availability[sourceIndex] ? 'Available' : 'Unavailable'}.`).join(' ')
            return <span key={id}>
              <button type="button" className="quran-word relative" aria-label={`${arabic} · ${snapshot.reference}:${position}`}
                aria-describedby={id} aria-pressed={selected?.reference === snapshot.reference && selected.position === position}
                onClick={() => setSelected({ reference: snapshot.reference, position, description })}>{arabic}
                <span aria-hidden="true" dir="ltr" className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-ui-body text-[10px] leading-none font-semibold tracking-[.12em] text-ui-muted">{availability.map(available => available ? filled : hollow).join('')}</span>
              </button>{' '}
              <span id={id} lang="en" hidden>{description}</span>
            </span>
          })}
          <span className="ayah-mark">۝{snapshot.reference.split(':')[1]}</span>
        </p>
        {selected?.reference === snapshot.reference && <p role="status" className="mt-2 mb-0 text-sm leading-relaxed text-ui-muted">Word {selected.position} · {selected.description}</p>}
      </section>)}
    </div>
  </main>
}
