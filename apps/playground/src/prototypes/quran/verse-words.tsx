import { useRef, useState, type RefObject } from 'react'
import { Button, TabsRoot, TabsList, TabsTrigger, TabsContent } from '@scratch-pages/ui'
import type { Ayah } from './quran-api'
import { useWordSelection } from './use-word-selection'
import { WordContent } from './word-content'
import { WordDialog } from './word-dialog'
import { WordGrammar } from './word-grammar'
import { WordDictionary } from './word-dictionary'
import { createLaneReader } from './lane-data'
import type { GrammarRecovery } from './use-reader'

export function VerseWords({ verse, chapterName, readingFocusRef, onGrammarRecovered, className = '' }: {
  verse: Ayah; chapterName: string; readingFocusRef: RefObject<HTMLElement | null>; readonly onGrammarRecovered: GrammarRecovery; readonly className?: string
}) {
  const selection = useWordSelection(verse.words)
  const [dictionaryReader] = useState(createLaneReader)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const { word } = selection
  return <>
    <p className={`arabic-text ${className}`} translate="no" lang="ar" dir="rtl">
      {verse.words ? verse.words.map(item => <span key={item.position}>
        <button type="button" className="quran-word" aria-label={`${item.arabic} · ${item.chapter}:${item.verse}:${item.position}`} aria-haspopup="dialog" aria-pressed={word?.position === item.position}
          ref={button => { if (button) buttons.current.set(item.position, button); else buttons.current.delete(item.position) }}
          onClick={() => selection.select(item.position)}>{item.arabic}</button>{' '}
      </span>) : verse.arabic}
      <span className="ayah-mark">۝{verse.number}</span>
    </p>
    {word && <WordDialog dismiss={selection.clear} getReturnFocusTarget={() => buttons.current.get(word.position)} fallbackFocusRef={readingFocusRef}
      summary={<WordContent word={word} chapterName={chapterName}/> }>
      <TabsRoot defaultValue="grammar" activationMode="manual" className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
        <TabsList aria-label="Word details" className="flex border-b border-ui-border">
          <TabsTrigger value="grammar">Grammar</TabsTrigger>
          <TabsTrigger value="dictionary">Dictionary</TabsTrigger>
        </TabsList>
        <TabsContent key={`grammar:${word.position}`} value="grammar" className="min-h-0 overflow-auto px-1 [scrollbar-gutter:stable]">
          <p className="mt-3 text-base font-semibold">{word.meaning ?? 'Meaning unavailable for this word.'}</p>
          <WordGrammar word={word} onGrammarRecovered={onGrammarRecovered}/>
          <div role="note" aria-label="Word sources" className="mt-6 border-t border-ui-border pt-3 text-sm text-ui-muted">English word data · Quran Foundation</div>
        </TabsContent>
        <TabsContent key={`dictionary:${word.position}`} value="dictionary" className="min-h-0 overflow-auto px-1 [scrollbar-gutter:stable]">
          <p className="mt-3 text-base font-semibold">{word.meaning ?? 'Meaning unavailable for this word.'}</p>
          <WordDictionary word={word} reader={dictionaryReader}/>
          <div role="note" aria-label="Word sources" className="mt-6 border-t border-ui-border pt-3 text-sm text-ui-muted">English word data · Quran Foundation</div>
        </TabsContent>
      </TabsRoot>
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-ui-border pt-2 text-xs" aria-label="Words in this verse">
        <Button variant="outline" size="compact" aria-label="Previous word" disabled={!selection.previous} onClick={selection.movePrevious}>Previous</Button>
        <span>Word {selection.index + 1} of {verse.words?.length}</span>
        <Button variant="outline" size="compact" aria-label="Next word" disabled={!selection.next} onClick={selection.moveNext}>Next</Button>
      </nav>
    </WordDialog>}
  </>
}
