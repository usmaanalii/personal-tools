import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@scratch-pages/ui'
import { VERSES_PER_PAGE, type QuranWord, type WordGrammar as GrammarOutcome } from '@scratch-pages/api-contracts/quran'
import { getVerses } from './quran-api'
import type { GrammarRecovery } from './use-reader'

type GrammarAnalysis = Pick<Extract<GrammarOutcome, { status: 'available' }>, 'segments'>
type GrammarState = { readonly status: 'loading' | 'failed' } | { readonly status: 'ready'; readonly analysis: GrammarAnalysis | null }

function receivedState(grammar: GrammarOutcome | undefined): GrammarState {
  if (grammar?.status === 'available') return { status: 'ready', analysis: grammar }
  if (grammar?.status === 'temporarily_unavailable') return { status: 'failed' }
  return { status: 'ready', analysis: null }
}

export function WordGrammar({ word, onGrammarRecovered }: { readonly word: QuranWord; readonly onGrammarRecovered: GrammarRecovery }) {
  const id = useId()
  const [expanded, setExpanded] = useState(false)
  const [retry, setRetry] = useState<'loading' | 'failed' | null>(null)
  const disclosure = useRef<HTMLButtonElement>(null)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])
  const current = retry ? { status: retry } : receivedState(word.grammar)
  async function load(trigger?: HTMLButtonElement) {
    if (current.status === 'loading') return
    const controller = new AbortController()
    pending.current = controller
    setRetry('loading')
    try {
      const page = await getVerses(word.chapter, Math.ceil(word.verse / VERSES_PER_PAGE), controller.signal)
      if (controller.signal.aborted) return
      const refreshed = page.verses.find(verse => verse.number === word.verse)?.words?.find(item => item.position === word.position)
      const grammar = (refreshed?.arabic === word.arabic ? refreshed.grammar : undefined) ?? { status: 'unavailable' }
      if (grammar.status === 'temporarily_unavailable') {
        setRetry('failed')
        return
      }
      onGrammarRecovered(word, grammar)
      setRetry(null)
      if (trigger === document.activeElement) disclosure.current?.focus()
    } catch {
      if (!controller.signal.aborted) setRetry('failed')
    } finally {
      if (pending.current === controller) pending.current = null
    }
  }
  function toggle() {
    setExpanded(!expanded)
  }
  return <div className="my-5 text-base leading-relaxed wrap-anywhere">
    <Button ref={disclosure} variant="outline" aria-expanded={expanded} aria-controls={id} onClick={toggle}>{expanded ? 'Collapse grammar' : 'Expand grammar'}</Button>
    <div id={id} hidden={!expanded}>
      {current.status === 'loading' && <p role="status">Loading grammar…</p>}
      {current.status === 'failed' && <p role="status">Analysis temporarily unavailable.</p>}
      {(current.status === 'failed' || current.status === 'loading') && <Button variant="outline" className="aria-disabled:cursor-default aria-disabled:opacity-60" aria-disabled={current.status === 'loading'} onClick={event => void load(event.currentTarget)}>Retry grammar</Button>}
      {current.status === 'ready' && !current.analysis && <p role="status">Analysis unavailable.</p>}
      {current.status === 'ready' && current.analysis && <>
        <ol className="my-4 grid list-none gap-4 p-0">
          {/* biome-ignore lint/suspicious/noArrayIndexKey: Corpus segments have immutable order within a word occurrence; their ordinal is their identity. */}
          {current.analysis.segments.map((segment, index) => <li key={`${word.chapter}:${word.verse}:${word.position}:${index + 1}`} className="rounded-ui-control border border-solid border-ui-border p-4">
            <p className="mt-0 font-semibold">{segment.kind.charAt(0).toUpperCase() + segment.kind.slice(1)} · {segment.partOfSpeech}</p>
            <p className="text-2xl" lang="ar" dir="rtl" translate="no">{segment.arabic}</p>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
              <dt>Root</dt><dd className="m-0">{segment.root ? <span lang="ar" dir="rtl" translate="no">{segment.root}</span> : 'No root assigned by the corpus.'}</dd>
              <dt>Lemma</dt><dd className="m-0">{segment.lemma ? <span lang="ar" dir="rtl" translate="no">{segment.lemma}</span> : 'Lemma not supplied.'}</dd>
            </dl>
            <ul className="mt-3 pl-5">{segment.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
          </li>)}
        </ol>
        <p className="text-ui-muted">Grammar · <a className="underline" href="https://corpus.quran.com/">Quranic Arabic Corpus v0.4</a>. Text · <a className="underline" href="https://tanzil.net/">Tanzil</a>. <a className="underline" href={`${import.meta.env.BASE_URL}quran-data/NOTICE.txt`}>Data notices</a>.</p>
      </>}
    </div>
  </div>
}
