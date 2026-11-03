import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { DialogClose, DialogContent, DialogRoot, DialogTitle, DialogTrigger } from './dialog'

const meta = {
  title: 'Overlays/Dialog',
  component: DialogContent,
  tags: ['autodocs'],
  argTypes: {
    children: { description: 'Dialog content. Include a DialogTitle for an accessible name.' },
    className: { description: 'Optional consumer class for responsive sizing and layout.' },
    onCloseAutoFocus: { description: 'Override the default focus return after dismissal.' },
    onInteractOutside: { description: 'Handle pointer interaction outside the modal.' },
  },
} satisfies Meta<typeof DialogContent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: function DialogExample() {
    const [open, setOpen] = useState(false)
    return <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button type="button">Open dialog</button></DialogTrigger>
      <DialogContent className="max-w-[480px] p-6">
        <DialogTitle>Reading settings</DialogTitle>
        <p>Adjust the reading experience for this session.</p>
        <DialogClose asChild><button type="button">Close dialog</button></DialogClose>
      </DialogContent>
    </DialogRoot>
  },
}
