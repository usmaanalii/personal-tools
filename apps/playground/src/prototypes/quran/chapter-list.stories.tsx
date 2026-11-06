import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChapterList } from './chapter-list'
import { BookmarkList, ChapterBrowser, ChapterViews, ChapterRequestStatus, ChapterSearch, type ChapterView } from './chapter-browser'
import type { Chapter } from './quran-api'
import './styles.css'

const firstChapter: Chapter = { id: 1, name: 'Al-Fātiḥah', arabic: 'الفاتحة', meaning: 'The Opening', verses: 7, place: 'Meccan' }
const chapters: Chapter[] = [firstChapter, { id: 2, name: 'Al-Baqarah', arabic: 'البقرة', meaning: 'The Cow', verses: 286, place: 'Medinan' }]

type ExampleProps = {
  state: 'populated' | 'loading' | 'failed' | 'no-results' | 'empty-bookmarks' | 'long-name'
  width: number
}

function ChapterBrowserExample({ state, width }: ExampleProps) {
  const [tab, setTab] = useState<ChapterView>(state === 'empty-bookmarks' ? 'bookmarks' : 'chapters')
  const [query, setQuery] = useState(state === 'no-results' ? 'Unmatched chapter' : '')
  const [selected, setSelected] = useState(1)
  const [retrying, setRetrying] = useState(false)
  const available = state === 'long-name' ? [{ ...firstChapter, name: 'A chapter name that is much longer than the available row width', meaning: 'A long chapter meaning that should wrap without hiding other content' }] : chapters
  return <div className="quran-reader max-w-full bg-ui-background p-4 font-ui-body text-ui-foreground" style={{ width }}>
    {state === 'loading' || retrying ? <ChapterRequestStatus message="Loading chapters…"/>
      : state === 'failed' ? <ChapterRequestStatus failed message="Quran content is temporarily unavailable. Please try again." onRetry={() => setRetrying(true)}/>
      : <><ChapterViews tab={tab} onTabChange={setTab} bookmarkCount={0}/><ChapterBrowser total={tab === 'chapters' ? available.length : 0} tab={tab}
          search={<ChapterSearch query={query} onQueryChange={setQuery} onClose={() => setQuery('')}/>}
        >
          {tab === 'chapters'
            ? <ChapterList chapters={available.filter(chapter => `${chapter.name} ${chapter.meaning} ${chapter.id}`.toLowerCase().includes(query.toLowerCase()))} selectedId={selected} onSelect={setSelected}/>
            : <BookmarkList chapters={available} bookmarkedChapter={null} savedVerses={[]} onOpenChapter={setSelected} onOpenVerse={() => undefined}/>
          }
        </ChapterBrowser></>}
  </div>
}

const meta = {
  title: 'Playground/Quran/Chapter browsing',
  component: ChapterBrowserExample,
  tags: ['autodocs'],
  args: { state: 'populated', width: 720 },
  argTypes: {
    state: { description: 'Intentional chapter browsing and request feedback states.' },
    width: { description: 'Canvas content width: 360px mobile or 720px desktop column.' },
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChapterBrowserExample>

export default meta
type Story = StoryObj<typeof meta>

export const PopulatedDesktop: Story = {}
export const PopulatedMobile: Story = { args: { width: 360 } }
export const LoadingDesktop: Story = { args: { state: 'loading' } }
export const LoadingMobile: Story = { args: { state: 'loading', width: 360 } }
export const FailedDesktop: Story = { args: { state: 'failed' } }
export const FailedMobile: Story = { args: { state: 'failed', width: 360 } }
export const NoResultsDesktop: Story = { args: { state: 'no-results' } }
export const NoResultsMobile: Story = { args: { state: 'no-results', width: 360 } }
export const EmptyBookmarksDesktop: Story = { args: { state: 'empty-bookmarks' } }
export const EmptyBookmarksMobile: Story = { args: { state: 'empty-bookmarks', width: 360 } }
export const LongNameDesktop: Story = { args: { state: 'long-name' } }
export const LongNameMobile: Story = { args: { state: 'long-name', width: 360 } }
