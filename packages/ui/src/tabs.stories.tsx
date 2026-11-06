import type { Meta, StoryObj } from '@storybook/react-vite'
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from './tabs'

const meta = {
  title: 'Navigation/Tabs',
  component: TabsRoot,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TabsRoot>

export default meta
type Story = StoryObj<typeof meta>

export const ManualActivation: Story = {
  render: () => <TabsRoot defaultValue="overview" activationMode="manual">
    <TabsList aria-label="Reading information" className="flex border-b border-ui-border">
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="details">Details</TabsTrigger>
    </TabsList>
    <TabsContent value="overview" className="p-4">A short introduction to the selected content.</TabsContent>
    <TabsContent value="details" className="p-4">Additional reading content. Arrow keys move focus; Enter or Space selects a tab.</TabsContent>
  </TabsRoot>,
}
