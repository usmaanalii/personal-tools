import { useEffect, useId, useRef, type ReactNode } from 'react'

export function WordDialog({ children, dismiss, onUnmount }: {
  children: ReactNode; dismiss: () => void; onUnmount: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => {
      element?.close()
      // React must finish removing the old word targets before choosing fallback focus.
      queueMicrotask(onUnmount)
    }
  }, [onUnmount])
  const close = () => { dialog.current?.close(); dismiss() }
  return <dialog ref={dialog} className="word-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close() }}>
    <header className="word-dialog-header"><h2 id={titleId}>Word meaning</h2><button type="button" onClick={close} aria-label="Close word meaning">Close</button></header>
    {children}
  </dialog>
}
