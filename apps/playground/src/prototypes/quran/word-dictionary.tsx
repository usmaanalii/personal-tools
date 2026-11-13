import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Button } from '@scratch-pages/ui'
import type { QuranWord } from '@scratch-pages/api-contracts/quran'
import { createLaneReader, type LaneEntry, type LaneResult } from './lane-data'

function Entry({ entry, match }: { readonly entry: LaneEntry; readonly match: LaneResult['match'] }) {
  const [full, setFull] = useState(false)
  const id = useId()
  const blocks = entry.blocks.filter(block => block.kind === 'sense' || block.runs.some(run => run.text.trim()))
  return <article aria-labelledby={id} aria-describedby={`${id}-identity`} className="my-4 rounded-ui-control border border-ui-border p-4">
    <h3 id={id} lang="ar" dir="rtl" translate="no" className="mt-0 text-xl">{entry.headword}</h3>
    <p id={`${id}-identity`} className="text-sm text-ui-muted">Entry {entry.id}</p>
    {match?.kind === 'lemma' && <p>Lemma match · <bdi lang="ar" dir="rtl" translate="no">{match.key}</bdi></p>}
    {match?.kind === 'root' && <p>Related to root · <bdi lang="ar" dir="rtl" translate="no">{match.key}</bdi></p>}
    {!match && <p>Match basis unavailable.</p>}
    <div className="my-3">{(full ? blocks : blocks.slice(0, 2)).map((block, index) =>
      // biome-ignore lint/suspicious/noArrayIndexKey: Pinned source blocks keep their original order; expansion only appends blocks.
      <span key={index}>
      {block.kind === 'sense' && <strong className="my-3 block">Sense {block.label}</strong>}
      {block.runs.map((run, ordinal) =>
        // biome-ignore lint/suspicious/noArrayIndexKey: Run ordinals identify immutable spans within the pinned source block.
        <span key={ordinal} lang={run.lang ?? undefined} dir={run.lang === 'ar' ? 'rtl' : undefined} translate={run.lang === 'ar' ? 'no' : undefined} className={run.emphasis ? 'italic' : undefined}>{run.text}</span>)}
    </span>)}</div>
    <Button variant="outline" aria-expanded={full} onClick={() => setFull(!full)}>{full ? 'Show shorter entry' : 'Read full entry'}</Button>
  </article>
}

export function WordDictionary({ word, reader }: { readonly word: QuranWord; readonly reader?: ReturnType<typeof createLaneReader> }) {
  const [localReader] = useState(createLaneReader)
  return <DictionaryPanel key={`${word.chapter}:${word.verse}:${word.position}:${JSON.stringify(word.grammar)}`} word={word} reader={reader ?? localReader}/>
}

function DictionaryPanel({ word, reader }: { readonly word: QuranWord; readonly reader: ReturnType<typeof createLaneReader> }) {
  const [entries, setEntries] = useState<LaneResult[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed' | 'ready'>('idle')
  const pending = useRef<AbortController | null>(null)
  const dictionary = useRef<HTMLElement>(null)
  const load = useCallback(async (trigger?: HTMLButtonElement) => {
    if (pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setStatus('loading')
    try {
      const result = await reader(word, controller.signal)
      if (controller.signal.aborted) return
      setEntries(result)
      setStatus('ready')
      if (trigger === document.activeElement && result.every(item => item.entry)) dictionary.current?.focus()
    } catch {
      if (!controller.signal.aborted) setStatus('failed')
    } finally {
      if (pending.current === controller) pending.current = null
    }
  }, [reader, word])
  useEffect(() => {
    void load()
    return () => {
      pending.current?.abort()
      pending.current = null
    }
  }, [load])
  return <div className="my-5 text-base leading-relaxed wrap-anywhere">
    {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard readers need to focus and scroll the dictionary while retaining the selected word context. */}
    <section ref={dictionary} aria-label="Lane’s dictionary" tabIndex={0}>
      <p>Root-related entries may discuss other words and senses. A lemma match identifies a headword, not the meaning in this verse.</p>
      {status === 'loading' && <p role="status">Loading dictionary…</p>}
      {status === 'failed' && <p role="status">Dictionary temporarily unavailable.</p>}
      {entries?.length === 0 && <p role="status">{word.grammar?.status === 'available'
        ? 'No verified Lane’s entry is available for this word.'
        : 'Verified morphology is unavailable for this word.'}</p>}
      {entries?.map(item => item.entry && <Entry key={item.id} entry={item.entry} match={item.match}/>)}
      {entries?.some(item => !item.entry) && <p role="status">Some dictionary entries are temporarily unavailable.</p>}
      {(status === 'failed' || status === 'loading' || entries?.some(item => !item.entry)) && <Button variant="outline" aria-disabled={status === 'loading'} onClick={event => void load(event.currentTarget)}>Retry dictionary</Button>}
      <div role="note" aria-label="Dictionary sources" className="mt-6 border-t border-ui-border pt-3 text-sm text-ui-muted">
        <p>Dictionary senses are not the contextual verse meaning. Root relationships do not establish historical etymology.</p>
        {entries?.map(item => item.entry
          ? <p key={item.id}><a href={item.entry.sourceUrl}>Original XML · {item.id}</a> · {item.entry.file}</p>
          : <p key={item.id}>Entry {item.id} is temporarily unavailable.</p>)}
        <p>Lane’s Arabic-English Lexicon · Perseus Digital Library, with Alpheios corrections. <a href="https://creativecommons.org/licenses/by-sa/3.0/us/">CC BY-SA 3.0 US</a></p>
      </div>
    </section>
  </div>
}
