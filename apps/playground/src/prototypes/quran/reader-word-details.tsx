import { useRef, useState, type RefObject } from 'react'
import { Button, TabsRoot, TabsList, TabsTrigger, TabsContent } from '@scratch-pages/ui'
import { occurrenceKey, type WordSelection } from './use-word-selection'
import { WordContent } from './word-content'
import { WordDialog } from './word-dialog'
import { WordGrammar } from './word-grammar'
import { WordDictionary } from './word-dictionary'
import { WordMufradat } from './word-mufradat'
import { createMufradatReader } from './mufradat-data'
import { createLaneReader } from './lane-data'
import type { RetryGrammar } from './use-reader'

export function ReaderWordDetails({ selection, chapterName, readingFocusRef, onRetryGrammar }: {
  readonly selection: WordSelection
  readonly chapterName: string
  readonly readingFocusRef: RefObject<HTMLElement | null>
  readonly onRetryGrammar: RetryGrammar
}) {
  const [dictionaryReader] = useState(createLaneReader)
  const [mufradatReader] = useState(createMufradatReader)
  const previous = useRef<HTMLButtonElement>(null)
  const next = useRef<HTMLButtonElement>(null)
  const { word, transition } = selection
  const loading = transition?.status === 'loading'
  const failed = transition?.status === 'failed'
  const direction = (loading || failed) && transition.direction === -1 ? 'previous' : 'next'
  if (!word) return null
  return <WordDialog dismiss={selection.clear} getReturnFocusTarget={() => document.getElementById(`reader-word-${occurrenceKey(word)}`) ?? undefined}
    fallbackFocusRef={readingFocusRef} summary={<WordContent word={word} chapterName={chapterName}/>}>
      <TabsRoot defaultValue="grammar" activationMode="manual" className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
        <TabsList aria-label="Word details" className="flex border-b border-ui-border [&>button]:flex-1 [&>button]:whitespace-nowrap [&>button]:px-2">
          <TabsTrigger value="grammar">Grammar</TabsTrigger>
          <TabsTrigger value="dictionary">Dictionary</TabsTrigger>
          <TabsTrigger value="mufradat">Mufradāt</TabsTrigger>
        </TabsList>
        <TabsContent key={`grammar:${occurrenceKey(word)}`} value="grammar" className="min-h-0 overflow-auto px-1 [scrollbar-gutter:stable]">
          <p className="mt-3 text-base font-semibold">{word.meaning ?? 'Meaning unavailable for this word.'}</p>
          <WordGrammar word={word} onRetryGrammar={onRetryGrammar}/>
          <div role="note" aria-label="Word sources" className="mt-6 border-t border-ui-border pt-3 text-sm text-ui-muted">English word data · Quran Foundation</div>
        </TabsContent>
        <TabsContent key={`mufradat:${occurrenceKey(word)}`} value="mufradat" className="min-h-0 overflow-auto px-1 [scrollbar-gutter:stable]">
          <p className="mt-3 text-base font-semibold">{word.meaning ?? 'Meaning unavailable for this word.'}</p>
          <WordMufradat word={word} reader={mufradatReader}/>
          <div role="note" aria-label="Word sources" className="mt-6 border-t border-ui-border pt-3 text-sm text-ui-muted">English word data · Quran Foundation</div>
        </TabsContent>
        <TabsContent key={`dictionary:${occurrenceKey(word)}`} value="dictionary" className="min-h-0 overflow-auto px-1 [scrollbar-gutter:stable]">
          <p className="mt-3 text-base font-semibold">{word.meaning ?? 'Meaning unavailable for this word.'}</p>
          <WordDictionary word={word} reader={dictionaryReader}/>
          <div role="note" aria-label="Word sources" className="mt-6 border-t border-ui-border pt-3 text-sm text-ui-muted">English word data · Quran Foundation</div>
        </TabsContent>
      </TabsRoot>
      <div className="border-t border-ui-border pt-2">
        <div role={loading ? 'status' : undefined} aria-live="polite" className="text-sm text-ui-muted">
          {loading && `Loading ${direction} word…`}
        </div>
        {failed && <p role="alert" className="my-1 text-sm">Could not load the {direction} word.</p>}
        {transition?.status === 'unavailable' && <p role="alert" className="my-1 text-sm">Word data is unavailable for verse {transition.verse}.</p>}
        {(failed || (loading && transition.retrying)) &&
          <Button variant="outline" size="compact" aria-disabled={loading} onClick={event => {
            const trigger = event.currentTarget
            selection.retry(() => {
              if (document.activeElement === trigger) (direction === 'previous' ? previous : next).current?.focus()
            })
          }}>Retry word navigation</Button>}
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs" aria-label="Word navigation">
          <Button ref={previous} variant="outline" size="compact" aria-label="Previous word" disabled={!selection.previous} aria-disabled={loading || undefined} onClick={selection.movePrevious}>Previous</Button>
          <span>Word {selection.index + 1} of {selection.count}</span>
          <Button ref={next} variant="outline" size="compact" aria-label="Next word" disabled={!selection.next} aria-disabled={loading || undefined} onClick={selection.moveNext}>Next</Button>
        </nav>
      </div>
  </WordDialog>
}
