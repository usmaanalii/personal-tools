import { useEffect, useId, useRef, useState } from 'react'
import type { QuranWord } from '@scratch-pages/api-contracts/quran'
import type { Ayah } from './quran-api'

export function VerseWords({ verse, chapterName }: { verse: Ayah; chapterName: string }) {
  const [position, setPosition] = useState<number | null>(null)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const words = verse.words
  const word = words?.find(item => item.position === position)
  return <>
    <p className="arabic-text" translate="no" lang="ar" dir="rtl">
      {words ? words.map(item => <span key={item.position}>
        <button type="button" className="quran-word" aria-label={`${item.arabic} · ${item.chapter}:${item.verse}:${item.position}`} aria-haspopup="dialog" aria-pressed={position === item.position}
          ref={button => { if (button) buttons.current.set(item.position, button); else buttons.current.delete(item.position) }}
          onClick={() => setPosition(item.position)}>{item.arabic}</button>{' '}
      </span>) : verse.arabic}
      <span className="ayah-mark">۝{verse.number}</span>
    </p>
    {word && words && <WordDialog word={word} words={words} chapterName={chapterName} select={setPosition}
      dismiss={() => { setPosition(null); buttons.current.get(word.position)?.focus() }}/>
    }
  </>
}

function WordDialog({ word, words, chapterName, select, dismiss }: {
  word: QuranWord; words: QuranWord[]; chapterName: string; select: (position: number) => void; dismiss: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  const close = () => { dialog.current?.close(); dismiss() }
  const index = words.findIndex(item => item.position === word.position)
  const previous = words[index - 1]
  const next = words[index + 1]
  return <dialog ref={dialog} className="word-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close() }}>
    <header className="word-dialog-header"><h2 id={titleId}>Word meaning</h2><button type="button" onClick={close} aria-label="Close word meaning">Close</button></header>
    <div className="word-details" aria-live="polite" aria-atomic="true">
      <p className="word-reference">{chapterName} · {word.chapter}:{word.verse}</p>
      <p className="word-arabic" lang="ar" dir="rtl" translate="no">{word.arabic}</p>
      <p className="word-transliteration">{word.transliteration ?? 'Transliteration unavailable'}</p>
      <p className="word-meaning">{word.meaning ?? 'Meaning unavailable for this word.'}</p>
      <p className="word-credit">English word data · Quran Foundation</p>
    </div>
    <nav className="word-navigation" aria-label="Words in this verse">
      <button type="button" disabled={!previous} onClick={() => { if (previous) select(previous.position) }}>Previous word</button>
      <span>Word {index + 1} of {words.length}</span>
      <button type="button" disabled={!next} onClick={() => { if (next) select(next.position) }}>Next word</button>
    </nav>
  </dialog>
}
