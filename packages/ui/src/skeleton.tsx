import type { ComponentProps } from 'react'

/** shadcn/ui Skeleton, using shared semantic tokens and reduced-motion support. */
export function Skeleton({ className = '', ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={`motion-safe:animate-pulse rounded-ui-control bg-ui-border ${className}`} {...props}/>
}
