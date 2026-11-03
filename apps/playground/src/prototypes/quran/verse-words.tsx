import { useRef } from 'react'
import type { Ayah } from './quran-api'
import { useWordSelection } from './use-word-selection'
import { WordContent } from './word-content'
import { WordDialog } from './word-dialog'

export function VerseWords({ verse, chapterName, restoreReadingFocus }: {
  verse: Ayah; chapterName: string; restoreReadingFocus: () => void
}) {
  const selection = useWordSelection(verse.words)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const { word } = selection
  const dismiss = () => {
    selection.clear()
    const target = word && buttons.current.get(word.position)
    if (target?.isConnected) target.focus()
  }
  return <>
    <p className="arabic-text" translate="no" lang="ar" dir="rtl">
      {verse.words ? verse.words.map(item => <span key={item.position}>
        <button type="button" className="quran-word" aria-label={`${item.arabic} · ${item.chapter}:${item.verse}:${item.position}`} aria-haspopup="dialog" aria-pressed={word?.position === item.position}
          ref={button => { if (button) buttons.current.set(item.position, button); else buttons.current.delete(item.position) }}
          onClick={() => selection.select(item.position)}>{item.arabic}</button>{' '}
      </span>) : verse.arabic}
      <span className="ayah-mark">۝{verse.number}</span>
    </p>
    {word && <WordDialog dismiss={dismiss} onUnmount={restoreReadingFocus} returnFocus={() => {
      const target = buttons.current.get(word.position)
      if (target?.isConnected) target.focus()
    }}>
      <WordContent word={word} chapterName={chapterName}/>
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-ui-border pt-5 max-[760px]:grid-cols-2 max-[760px]:[&>span]:col-span-2 max-[760px]:[&>span]:row-start-2" aria-label="Words in this verse">
        <button type="button" disabled={!selection.previous} onClick={selection.movePrevious}>Previous word</button>
        <span>Word {selection.index + 1} of {verse.words?.length}</span>
        <button type="button" disabled={!selection.next} onClick={selection.moveNext}>Next word</button>
      </nav>
    </WordDialog>}
  </>
}
