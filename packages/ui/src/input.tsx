import type { ComponentPropsWithRef } from 'react'

/** Native input; the caller supplies its visible label and any description. */
export function Input({ className = '', ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={`box-border min-h-11 w-full min-w-0 rounded-ui-control border border-solid border-ui-border bg-ui-surface px-3 py-2 font-ui-body text-base text-ui-foreground placeholder:text-ui-muted focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ui-focus disabled:opacity-60 ${className}`} {...props} />
}
