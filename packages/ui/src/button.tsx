import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ className = '', type = 'button', ...props }: ButtonProps) {
  return <button className={`ui-button bg-ui-primary text-ui-on-primary focus-visible:outline-ui-focus ${className}`} type={type} {...props} />
}
