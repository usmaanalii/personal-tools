import type { ComponentPropsWithRef } from 'react'

type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'default' | 'icon' | 'compact'
}

const variants = {
  primary: 'border-0 bg-ui-primary text-ui-on-primary hover:enabled:bg-ui-primary-hover',
  outline: 'border border-solid border-ui-border bg-ui-surface text-ui-foreground hover:enabled:bg-ui-background',
  ghost: 'border-0 bg-transparent text-ui-muted hover:enabled:bg-ui-background aria-pressed:bg-ui-primary aria-pressed:text-ui-on-primary',
}

const sizes = {
  default: 'px-4 py-3 text-base',
  icon: 'size-11 shrink-0 p-0 text-base',
  compact: 'px-2 py-2 text-sm',
}

export function Button({ className = '', type = 'button', variant = 'primary', size = 'default', ...props }: ButtonProps) {
  return <button className={`ui-button box-border inline-flex min-h-11 items-center justify-center gap-2 rounded-ui-control font-ui-body font-bold leading-normal cursor-pointer transition-colors duration-(--theme-motion-fast) focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-3 focus-visible:outline-ui-focus disabled:cursor-default disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`} type={type} {...props} />
}
