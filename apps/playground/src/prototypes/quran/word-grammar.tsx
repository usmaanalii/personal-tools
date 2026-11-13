import { useEffect, useRef, useState } from 'react'
import { Button, Skeleton } from '@scratch-pages/ui'
import type { QuranWord, WordGrammar as GrammarOutcome } from '@scratch-pages/api-contracts/quran'
import type { RetryGrammar } from './use-reader'

type GrammarAnalysis = Pick<Extract<GrammarOutcome, { status: 'available' }>, 'segments'>
type GrammarState = { readonly status: 'loading' | 'failed' } | { readonly status: 'ready'; readonly analysis: GrammarAnalysis | null }

function receivedState(grammar: GrammarOutcome | undefined): GrammarState {
  if (grammar?.status === 'available') return { status: 'ready', analysis: grammar }
  if (grammar?.status === 'temporarily_unavailable') return { status: 'failed' }
  return { status: 'ready', analysis: null }
}

export function WordGrammar({ word, onRetryGrammar }: { readonly word: QuranWord; readonly onRetryGrammar: RetryGrammar }) {
  const [retry, setRetry] = useState<'loading' | 'failed' | null>(null)
  const analysis = useRef<HTMLElement>(null)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])
  const current = retry ? { status: retry } : receivedState(word.grammar)
  async function load(trigger?: HTMLButtonElement) {
    if (current.status === 'loading') return
    const controller = new AbortController()
    pending.current = controller
    setRetry('loading')
    try {
      const outcome = await onRetryGrammar(word, controller.signal)
      if (controller.signal.aborted) return
      if (outcome === 'failed') {
        setRetry('failed')
        return
      }
      setRetry(null)
      if (trigger === document.activeElement) analysis.current?.focus()
    } catch {
      if (!controller.signal.aborted) setRetry('failed')
    } finally {
      if (pending.current === controller) pending.current = null
    }
  }
  return <div className="my-5 text-base leading-relaxed wrap-anywhere">
    {current.status === 'loading' && <p role="status" className="sr-only">Loading grammar…</p>}
    {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard readers need a focus target to scroll the analysis region. */}
    <section ref={analysis} aria-label="Grammar analysis" tabIndex={0} aria-busy={current.status === 'loading'}>
      {current.status === 'loading' && <div aria-hidden="true" className="my-4 space-y-3"><Skeleton className="h-5 w-1/2"/><Skeleton className="ml-auto h-8 w-1/3"/><Skeleton className="h-4 w-full"/><Skeleton className="h-4 w-3/4"/></div>}
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
      </>}
    </section>
  </div>
}
