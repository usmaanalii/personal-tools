import { type ComponentProps, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { buildOpeningVerse, chapters } from './quran-fixtures.test-data'
import { VerseView } from './verse-view'
import './styles.css'

function VerseReadingExample({ layout = 'stacked' }: Pick<ComponentProps<typeof VerseView>, 'layout'>) {
  const [saved, setSaved] = useState(false)
  const [active, setActive] = useState(false)
  const [verse, setVerse] = useState(buildOpeningVerse)
  const heading = useRef<HTMLHeadingElement>(null)
  return <main className="quran-reader min-h-screen bg-ui-background p-4 font-ui-body text-ui-foreground sm:p-8">
    <h1 ref={heading} tabIndex={-1} className="font-ui-heading text-2xl">Al-Fātiḥah</h1>
    <p className="text-sm text-ui-muted">Dr. Mustafa Khattab, The Clear Quran · Quran Foundation</p>
    <div className="verse-list rounded-ui-card bg-ui-surface p-4">
      <VerseView verse={verse} chapter={chapters[0]} saved={saved} active={active} layout={layout}
        onGrammarRecovered={(word, grammar) => setVerse(current => ({ ...current, words: current.words?.map(item => item.position === word.position ? { ...item, grammar } : item) }))}
        onBookmark={() => setSaved(value => !value)} onActivate={() => setActive(true)} readingFocusRef={heading}/>
    </div>
  </main>
}

const meta = {
  title: 'Playground/Quran/Verse reading',
  component: VerseReadingExample,
  tags: ['autodocs'],
  argTypes: { layout: { options: ['stacked', 'parallel'], control: 'select', description: 'App-owned presentation variant. Feature data, controls and actions are unchanged.' } },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof VerseReadingExample>

export default meta
type Story = StoryObj<typeof meta>

export const Stacked: Story = {}
export const ParallelTranslation: Story = {
  args: { layout: 'parallel' },
}
