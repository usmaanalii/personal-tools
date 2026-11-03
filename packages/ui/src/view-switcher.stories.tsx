import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ViewSwitcher } from './view-switcher'

const meta = {
  title: 'Controls/View switcher',
  component: ViewSwitcher,
  tags: ['autodocs'],
  args: { label: 'Chapter views', options: [{ value: 'chapters', label: 'All chapters' }, { value: 'bookmarks', label: 'My bookmarks 0' }], value: 'chapters', onValueChange: () => undefined },
  argTypes: {
    label: { description: 'Accessible name of the native button group.' },
    options: { description: 'Available values and their visible labels.' },
    value: { description: 'The selected value; exactly one button is pressed.' },
    onValueChange: { description: 'Requests a view change; feature state stays in the caller.' },
  },
} satisfies Meta<typeof ViewSwitcher>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: function Example(args) {
    const [value, setValue] = useState(args.value)
    return <ViewSwitcher {...args} value={value} onValueChange={setValue}/>
  },
}
