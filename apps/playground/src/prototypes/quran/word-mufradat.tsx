import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { MufradatResponse, QuranWord } from '@scratch-pages/api-contracts/quran'
import { createMufradatReader } from './mufradat-data'
import { Button } from '@scratch-pages/ui'

export function WordMufradat({ word, reader: suppliedReader }: { readonly word: QuranWord; readonly reader?: ReturnType<typeof createMufradatReader> }) {
  const [localReader] = useState(createMufradatReader)
  const reader = suppliedReader ?? localReader
  return <MufradatPanel key={`${word.chapter}:${word.verse}:${word.position}:${JSON.stringify(word.grammar)}`} word={word} reader={reader}/>
}

function MufradatPanel({ word, reader }: { readonly word: QuranWord; readonly reader: ReturnType<typeof createMufradatReader> }) {
  const [result, setResult] = useState<MufradatResponse | null>(null)
  const [full, setFull] = useState(false)
  const [status, setStatus] = useState<'loading' | 'failed' | 'ready'>('loading')
  const pending = useRef<AbortController | null>(null)
  const section = useRef<HTMLElement>(null)
  const id = useId()
  const load = useCallback(async (controller: AbortController, trigger?: HTMLButtonElement) => {
    if (pending.current) return
    pending.current = controller
    setStatus('loading')
    try {
      const value = await reader(word, controller.signal)
      if (controller.signal.aborted) return
      setResult(value)
      setStatus('ready')
      if (trigger === document.activeElement) section.current?.focus()
    } catch {
      if (!controller.signal.aborted) setStatus('failed')
    } finally {
      if (pending.current === controller) pending.current = null
    }
  }, [reader, word])
  useEffect(() => {
    const controller = new AbortController()
    void load(controller)
    return () => { pending.current?.abort(); pending.current = null }
  }, [load])
  const entry = result?.status === 'matched' ? result.entry : null
  const paragraphs = entry?.paragraphs ?? []
  const excerpt = paragraphs[0] ?? ''
  const visibleParagraphs = full ? paragraphs : [excerpt.length > 320 ? `${excerpt.slice(0, 320)}…` : excerpt]
  return <div className="my-5 text-base leading-relaxed wrap-anywhere">
    {/* biome-ignore lint/a11y/noNoninteractiveTabindex: The dictionary receives focus after retry and supports keyboard scrolling. */}
    <section ref={section} aria-label="Mufradāt dictionary" tabIndex={0}>
    {status === 'loading' && <p role="status">Loading Mufradāt…</p>}
    {status === 'failed' && <p role="status">Mufradāt temporarily unavailable.</p>}
    {result?.status === 'missing' && <p role="status">No verified Mufradāt entry is available for this word.</p>}
    {result?.status === 'ambiguous' && <p role="status">More than one Mufradāt entry may match. No entry has been selected.</p>}
    {status !== 'ready' && <Button variant="outline" aria-disabled={status === 'loading'} onClick={event => void load(new AbortController(), event.currentTarget)}>Retry Mufradāt</Button>}
    {entry && <><article aria-labelledby={id}>
      <h3 id={id} lang="ar" dir="rtl" translate="no" className="text-xl">{entry.headword}</h3>
      {visibleParagraphs.map((text, index) =>
        // biome-ignore lint/suspicious/noArrayIndexKey: Pinned source paragraphs retain their order; expansion only appends paragraphs.
        <p key={`${entry.id}:${index}`} lang="ar" dir="rtl" translate="no" className="text-xl leading-loose">{text}</p>)}
      <Button variant="outline" aria-expanded={full} onClick={() => setFull(!full)}>{full ? 'Show shorter Arabic entry' : 'Read full Arabic entry'}</Button>
    </article>
    <div role="note" aria-label="Mufradat sources" className="mt-6 border-t border-ui-border pt-3 text-sm text-ui-muted">
      <p>Al-Rāghib al-Iṣfahānī · المفردات في غريب القرآن · OpenITI</p>
      <p><a href={entry.sourceUrl}>OpenITI original · {entry.id}</a></p>
      <p>{entry.pages.join(' · ')}</p>
      <p><a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a> · Non-commercial use · Arabic excerpt adaptation</p>
      <p>This source’s lexical explanation is separate from the contextual meaning. Root relationships do not establish historical etymology.</p>
    </div></>}
    </section>
  </div>
}
