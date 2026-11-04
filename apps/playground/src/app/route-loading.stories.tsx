import type { Meta, StoryObj } from '@storybook/react-vite'
import { RouteLoading } from './route-loading'

const meta = {
  title: 'Playground/Route loading',
  component: RouteLoading,
  tags: ['autodocs'],
  args: { title: 'Quran reader', message: 'Loading Quran reader…' },
  argTypes: {
    title: { description: 'Destination name displayed while its JavaScript loads.' },
    message: { description: 'Polite loading announcement specific to the destination.' },
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RouteLoading>

export default meta
type Story = StoryObj<typeof meta>

export const Quran: Story = {}
export const Supabase: Story = { args: { title: 'Supabase API demo', message: 'Loading Supabase demo…' } }
