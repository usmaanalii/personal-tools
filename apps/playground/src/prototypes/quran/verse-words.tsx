import { useRef, useState, type RefObject } from 'react'
import { Button } from '@scratch-pages/ui'
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
    {word && <WordDialog dismiss={selection.clear} getReturnFocusTarget={() => buttons.current.get(word.position)} fallbackFocusRef={readingFocusRef}>
      <WordContent word={word} chapterName={chapterName}/>
      <WordGrammar key={`${word.chapter}:${word.verse}:${word.position}`} word={word} onGrammarRecovered={onGrammarRecovered}/>
      <WordDictionary word={word} reader={dictionaryReader}/>
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-ui-border pt-5 max-[760px]:grid-cols-2 max-[760px]:[&>span]:col-span-2 max-[760px]:[&>span]:row-start-2" aria-label="Words in this verse">
        <Button variant="outline" size="compact" disabled={!selection.previous} onClick={selection.movePrevious}>Previous word</Button>
        <span>Word {selection.index + 1} of {verse.words?.length}</span>
        <Button variant="outline" size="compact" disabled={!selection.next} onClick={selection.moveNext}>Next word</Button>
      </nav>
    </WordDialog>}
  </>
}
