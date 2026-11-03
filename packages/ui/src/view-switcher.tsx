import type { ReactNode } from 'react'
import { Button } from './button'

type ViewSwitcherProps<Value extends string> = {
  label: string
  options: readonly { value: Value; label: ReactNode }[]
  value: Value
  onValueChange: (value: Value) => void
}

/** Exclusive view choices using native buttons; every choice is in the Tab order. */
export function ViewSwitcher<Value extends string>({ label, options, value, onValueChange }: ViewSwitcherProps<Value>) {
  return <fieldset className="m-0 min-w-0 border-0 p-0">
    <legend className="sr-only">{label}</legend>
    <div className="flex flex-wrap gap-2">
      {options.map(option => <Button key={option.value} variant="ghost" aria-pressed={value === option.value} onClick={() => onValueChange(option.value)}>{option.label}</Button>)}
    </div>
  </fieldset>
}
