import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './input'

const meta = {
  title: 'Controls/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    id: { description: 'Connects the input with its visible label.' },
    placeholder: { description: 'An example or hint, in addition to a label.' },
    disabled: { description: 'Prevents editing while the input is unavailable.' },
    className: { description: 'Optional composition classes.' },
  },
  args: { id: 'search-example', placeholder: 'Search by chapter or meaning…' },
  render: args => <div><label htmlFor={args.id} className="mb-2 block font-ui-body">Search chapters</label><Input {...args}/></div>,
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
