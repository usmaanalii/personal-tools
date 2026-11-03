import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'

const meta = {
  title: 'Controls/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    children: { description: 'Visible action label.' },
    disabled: { description: 'Prevents a repeated action while work is pending.' },
    className: { description: 'Optional app-specific spacing or layout classes.' },
    type: { description: 'Native button type; defaults to button.' },
    variant: { description: 'Primary action, outlined secondary action, or quiet navigation action.' },
    size: { description: 'Default text action, 44px icon action, or compact navigation action.' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { children: 'Check connection' } }
export const Loading: Story = { args: { children: 'Checking connection…', disabled: true } }
export const Retry: Story = { args: { children: 'Try again' } }
export const LongLabel: Story = { args: { children: 'Check the connection to the Supabase function again' } }

export const Outline: Story = { args: { variant: 'outline', children: 'Previous verses' } }
export const Ghost: Story = { args: { variant: 'ghost', children: 'Bookmarks' } }
export const Selected: Story = { args: { variant: 'ghost', children: 'All chapters', 'aria-pressed': true } }
export const Icon: Story = { args: { variant: 'ghost', size: 'icon', 'aria-label': 'Close search', children: '×' } }
