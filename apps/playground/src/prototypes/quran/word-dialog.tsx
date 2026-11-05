import { useEffect, type ReactNode, type RefObject } from 'react'
import { Button, DialogClose, DialogContent, DialogRoot, DialogTitle } from '@scratch-pages/ui'

export function WordDialog({ children, dismiss, getReturnFocusTarget, fallbackFocusRef }: {
  readonly children: ReactNode
  readonly dismiss: () => void
  readonly getReturnFocusTarget: () => HTMLElement | undefined
  readonly fallbackFocusRef: RefObject<HTMLElement | null>
}) {
  const returnFocus = () => {
    const target = getReturnFocusTarget()
    if (target?.isConnected) target.focus()
  }
  useEffect(() => {
    return () => {
      // React must finish removing the old word targets before choosing fallback focus.
      queueMicrotask(() => {
        const active = document.activeElement
        if (!active || active === document.body || !active.isConnected) fallbackFocusRef.current?.focus()
      })
    }
  }, [fallbackFocusRef])
  return <DialogRoot defaultOpen onOpenChange={open => {
    if (open) return
    dismiss()
    // Preserve immediate return before the deferred unmount fallback runs.
    returnFocus()
  }}>
    <DialogContent className="w-[calc(100%_-_32px)] max-w-[520px] p-6 text-base leading-[1.6] [overflow-wrap:anywhere] max-[760px]:inset-x-0 max-[760px]:inset-y-auto max-[760px]:bottom-0 max-[760px]:m-0 max-[760px]:max-h-[85dvh] max-[760px]:w-full max-[760px]:max-w-none max-[760px]:rounded-b-none max-[760px]:pl-[max(20px,env(safe-area-inset-left))] max-[760px]:pr-[max(20px,env(safe-area-inset-right))] max-[760px]:pb-[max(24px,env(safe-area-inset-bottom))] max-[760px]:pt-5" onCloseAutoFocus={event => {
      event.preventDefault()
      returnFocus()
    }} onInteractOutside={event => event.preventDefault()}>
      <header className="flex items-center justify-between gap-4">
        <DialogTitle className="m-0 font-ui-heading text-xl font-semibold">Word meaning</DialogTitle>
        <DialogClose asChild><Button variant="outline" size="compact" aria-label="Close word meaning">Close</Button></DialogClose>
      </header>
      {children}
    </DialogContent>
  </DialogRoot>
}
