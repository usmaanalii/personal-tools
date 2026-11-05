import { useId, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import '@scratch-pages/design-tokens/catalogue.css'
import { Button } from './button'
import { Input } from './input'
import { ViewSwitcher } from './view-switcher'

function ThemePanel({ name, theme }: { readonly name: string; readonly theme?: string }) {
  const id = useId()
  const [view, setView] = useState('chapters')
  return <section aria-labelledby={`${id}-heading`} data-theme={theme} className="min-w-0 rounded-ui-card bg-ui-background p-6 text-ui-foreground">
    <h2 id={`${id}-heading`} className="mt-0 font-ui-heading text-xl">{name}</h2>
    <p className="text-ui-muted">The same controls, spacing and behaviour with a different semantic colour mapping.</p>
    <label htmlFor={`${id}-search`} className="mb-2 block">Search chapters</label>
    <Input id={`${id}-search`} placeholder="Chapter name"/>
    <div className="my-4"><ViewSwitcher label="Chapter views" value={view} onValueChange={setView}
      options={[{ value: 'chapters', label: 'All chapters' }, { value: 'bookmarks', label: 'Bookmarks' }]}/></div>
    <Button disabled>Audio coming soon</Button>
  </section>
}

function SemanticThemes() {
  return <main className="max-w-5xl p-4 font-ui-body">
    <h1 className="font-ui-heading text-2xl">Semantic themes</h1>
    <div className="grid gap-6 md:grid-cols-2">
      <ThemePanel name="Default light"/>
      <ThemePanel name="Alternate slate" theme="catalogue-slate"/>
    </div>
  </main>
}

const meta = {
  title: 'Foundations/Semantic themes',
  component: SemanticThemes,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SemanticThemes>

export default meta
type Story = StoryObj<typeof meta>
export const Comparison: Story = {}
