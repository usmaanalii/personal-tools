import { useEffect, type ReactNode, type RefObject } from 'react'
import { Button, DialogClose, DialogContent, DialogRoot, DialogTitle } from '@scratch-pages/ui'

export function WordDialog({ children, summary, dismiss, getReturnFocusTarget, fallbackFocusRef }: {
  readonly children: ReactNode
  readonly summary: ReactNode
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
    <DialogContent className="grid grid-rows-[auto_minmax(0,1fr)_auto] gap-2 p-4 text-base leading-[1.6] [overflow-wrap:anywhere] min-[761px]:h-[min(48rem,90dvh)] min-[761px]:overflow-hidden max-[760px]:m-0 max-[760px]:h-dvh max-[760px]:max-h-none max-[760px]:w-full max-[760px]:overflow-hidden max-[760px]:rounded-none max-[760px]:border-0 max-[760px]:pl-[max(12px,env(safe-area-inset-left))] max-[760px]:pr-[max(12px,env(safe-area-inset-right))] max-[760px]:pb-[max(12px,env(safe-area-inset-bottom))] max-[760px]:pt-[max(8px,env(safe-area-inset-top))]" onCloseAutoFocus={event => {
      event.preventDefault()
      returnFocus()
    }} onInteractOutside={event => event.preventDefault()}>
      <header className="flex min-w-0 items-center gap-3">
        <DialogTitle className="sr-only">Word meaning</DialogTitle>
        <DialogClose asChild><Button variant="outline" size="compact" aria-label="Close word meaning">Close</Button></DialogClose>
        {summary}
      </header>
      {children}
    </DialogContent>
  </DialogRoot>
}
