import * as DialogPrimitive from '@radix-ui/react-dialog'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'

export const DialogRoot = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

const overlayClasses = 'fixed inset-0 z-50 overflow-y-auto bg-[rgb(21_39_31_/_80%)] p-4'
const contentClasses = 'fixed inset-0 z-[51] m-auto box-border h-fit max-h-[90dvh] w-[min(calc(100%_-_32px),520px)] overflow-auto rounded-ui-card border border-ui-border bg-ui-surface text-ui-foreground shadow-ui-card outline-none focus-visible:outline-[3px] focus-visible:outline-ui-focus focus-visible:outline-offset-[3px] [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-ui-focus [&_*:focus-visible]:outline-offset-[3px]'

export const DialogOverlay = forwardRef<ElementRef<typeof DialogPrimitive.Overlay>, ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay {...props} ref={ref} className={[overlayClasses, className].filter(Boolean).join(' ')} />
  ),
)
DialogOverlay.displayName = 'DialogOverlay'

export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        {...props}
        ref={ref}
        aria-describedby={props['aria-describedby'] ?? undefined}
        className={[contentClasses, className].filter(Boolean).join(' ')}
      />
    </DialogPortal>
  ),
)
DialogContent.displayName = 'DialogContent'

export const DialogTitle = forwardRef<ElementRef<typeof DialogPrimitive.Title>, ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  (props, ref) => <DialogPrimitive.Title {...props} ref={ref} className={['ui-dialog-title', props.className].filter(Boolean).join(' ')} />,
)
DialogTitle.displayName = 'DialogTitle'
