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
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { children: 'Check connection' } }
export const Loading: Story = { args: { children: 'Checking connection…', disabled: true } }
export const Retry: Story = { args: { children: 'Try again' } }
export const LongLabel: Story = { args: { children: 'Check the connection to the Supabase function again' } }
