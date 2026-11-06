import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@scratch-pages/ui'
import type { QuranWord } from '@scratch-pages/api-contracts/quran'
import { createLaneReader, type LaneEntry, type LaneResult } from './lane-data'

function Entry({ entry }: { readonly entry: LaneEntry }) {
  const [full, setFull] = useState(false)
  const id = useId()
  const blocks = entry.blocks.filter(block => block.kind === 'sense' || block.runs.some(run => run.text.trim()))
  return <article aria-labelledby={id} className="my-4 rounded-ui-control border border-ui-border p-4">
    <h3 id={id} lang="ar" dir="rtl" translate="no" className="mt-0 text-xl">{entry.headword} <bdi lang="en">· {entry.id}</bdi></h3>
    <div className="my-3">{(full ? blocks : blocks.slice(0, 2)).map((block, index) =>
      // biome-ignore lint/suspicious/noArrayIndexKey: Pinned source blocks keep their original order; expansion only appends blocks.
      <span key={index}>
      {block.kind === 'sense' && <strong className="my-3 block">Sense {block.label}</strong>}
      {block.runs.map((run, ordinal) =>
        // biome-ignore lint/suspicious/noArrayIndexKey: Run ordinals identify immutable spans within the pinned source block.
        <span key={ordinal} lang={run.lang ?? undefined} dir={run.lang === 'ar' ? 'rtl' : undefined} translate={run.lang === 'ar' ? 'no' : undefined} className={run.emphasis ? 'italic' : undefined}>{run.text}</span>)}
    </span>)}</div>
    <Button variant="outline" aria-expanded={full} onClick={() => setFull(!full)}>{full ? 'Show shorter entry' : 'Read full entry'}</Button>
    <p className="text-sm text-ui-muted"><a href={entry.sourceUrl}>Original XML · {entry.id}</a> · {entry.file}</p>
  </article>
}

export function WordDictionary({ word, reader }: { readonly word: QuranWord; readonly reader?: ReturnType<typeof createLaneReader> }) {
  const [localReader] = useState(createLaneReader)
  return <DictionaryPanel key={`${word.chapter}:${word.verse}:${word.position}:${JSON.stringify(word.grammar)}`} word={word} reader={reader ?? localReader}/>
}

function DictionaryPanel({ word, reader }: { readonly word: QuranWord; readonly reader: ReturnType<typeof createLaneReader> }) {
  const [expanded, setExpanded] = useState(false)
  const [entries, setEntries] = useState<LaneResult[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed' | 'ready'>('idle')
  const pending = useRef<AbortController | null>(null)
  const disclosure = useRef<HTMLButtonElement>(null)
  useEffect(() => () => pending.current?.abort(), [])
  const id = useId()
  async function load(trigger?: HTMLButtonElement) {
    if (status === 'loading') return
    const controller = new AbortController()
    pending.current = controller
    setStatus('loading')
    try {
      const result = await reader(word, controller.signal)
      if (controller.signal.aborted) return
      setEntries(result)
      setStatus('ready')
      if (trigger === document.activeElement && result.every(item => item.entry)) disclosure.current?.focus()
    } catch {
      if (!controller.signal.aborted) setStatus('failed')
    }
  }
  function toggle() {
    setExpanded(!expanded)
    if (!expanded && status === 'idle') void load()
  }
  return <div className="my-5 text-base leading-relaxed wrap-anywhere">
    <Button ref={disclosure} variant="outline" aria-expanded={expanded} aria-controls={id} onClick={toggle}>{expanded ? 'Collapse dictionary' : 'Expand dictionary'}</Button>
    {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard readers need to focus and scroll the dictionary while retaining the selected word context. */}
    <section id={id} hidden={!expanded} aria-label="Lane’s dictionary" tabIndex={0} className="mt-4 h-[clamp(10rem,28svh,18rem)] overflow-auto [scrollbar-gutter:stable] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-ui-focus">
      {expanded && <div className="sticky top-0 z-10 border-b border-ui-border bg-ui-surface py-2">
        <p className="m-0 text-sm text-ui-muted">Selected word · {word.chapter}:{word.verse}:{word.position}</p>
        <p className="m-0 text-xl" lang="ar" dir="rtl" translate="no">{word.arabic}</p>
      </div>}
      <p>Dictionary senses are not the contextual verse meaning. Root relationships do not establish historical etymology.</p>
      {status === 'loading' && <p role="status">Loading dictionary…</p>}
      {status === 'failed' && <p role="status">Dictionary temporarily unavailable.</p>}
      {entries?.length === 0 && <p role="status">No verified Lane’s entry is available for this word.</p>}
      {entries?.map(item => item.entry ? <Entry key={item.id} entry={item.entry}/> : <p role="status" key={item.id}>Entry {item.id} is temporarily unavailable.</p>)}
      {(status === 'failed' || status === 'loading' || entries?.some(item => !item.entry)) && <Button variant="outline" aria-disabled={status === 'loading'} onClick={event => void load(event.currentTarget)}>Retry dictionary</Button>}
      <p className="text-sm text-ui-muted">Lane’s Arabic-English Lexicon · Perseus Digital Library, with Alpheios corrections. <a href="https://creativecommons.org/licenses/by-sa/3.0/us/">CC BY-SA 3.0 US</a></p>
    </section>
  </div>
}
