import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './skeleton'

const meta = {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  args: { className: 'h-5 w-64' },
  argTypes: { className: { description: 'Placeholder dimensions matching the content it replaces. Decorative; announce loading on the owning region.' } },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>
export const Text: Story = {}
export const Card: Story = { args: { className: 'h-40 w-72 rounded-ui-card' } }
