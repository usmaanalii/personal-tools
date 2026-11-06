import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReaderLoading } from './reader-loading'

const meta = {
  title: 'Playground/Quran/Reader loading',
  component: ReaderLoading,
  tags: ['autodocs'],
  argTypes: {
    message: { description: 'Polite announcement for the current request stage.' },
    failure: { description: 'Chapter request failure and retry action; stops skeleton feedback without collapsing the shell.' },
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ReaderLoading>

export default meta
type Story = StoryObj<typeof meta>
export const Chapters: Story = {}
export const Failed: Story = { args: { failure: { message: 'Quran content is temporarily unavailable. Please try again.', onRetry: () => {} } } }
