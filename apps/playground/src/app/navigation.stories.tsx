import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlaygroundHome } from './playground-home'

const meta = {
  title: 'Playground/Navigation',
  component: PlaygroundHome,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PlaygroundHome>

export default meta
type Story = StoryObj<typeof meta>

export const Home: Story = {}
