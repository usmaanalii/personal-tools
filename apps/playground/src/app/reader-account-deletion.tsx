import { useEffect, useId, useRef, useState } from 'react'
import { Button, DialogContent, DialogRoot, DialogTitle, DialogTrigger } from '@scratch-pages/ui'

export type DeletionCallbackResult =
  | { readonly status: 'verified'; readonly intent: string; readonly accountId: string }
  | { readonly status: 'invalid' }

export type AccountDeletion = {
  readonly begin: () => Promise<
    { readonly status: 'sent'; readonly intent: string } | { readonly status: 'rate-limited' }
  >
  readonly confirm: (intent: string, accountId: string) => Promise<'deleted' | 'pending' | 'invalid'>
  readonly cancel: (intent: string, accountId: string) => Promise<'cancelled' | 'pending' | 'invalid'>
}

type Stage = 'ready' | 'sending' | 'send-failed' | 'rate-limited' | 'confirming' | 'confirm-failed' | 'cancelling' | 'cancel-failed' | 'pending' | 'invalid'
const pendingMessage = 'Account deletion is still pending.'

export function ReaderAccountDeletion({ identity, deletion, verifiedIntent, onDismiss, onDeleted, disabled }: {
  readonly identity: { readonly id: string; readonly label: string }
  readonly deletion: AccountDeletion
  readonly verifiedIntent: string | undefined
  readonly onDismiss: () => void
  readonly onDeleted: () => void
  readonly disabled: boolean
}) {
  const description = useId()
  const [open, setOpen] = useState(Boolean(verifiedIntent))
  const [stage, setStage] = useState<Stage>('ready')
  const [sentIntent, setSentIntent] = useState<string>()
  const [cancelled, setCancelled] = useState(false)
  const busy = stage === 'sending' || stage === 'confirming' || stage === 'cancelling'
  const showClose = stage === 'pending' || stage === 'invalid' || stage === 'cancel-failed'
  const activeIntent = verifiedIntent ?? sentIntent
  const pendingStatus = useRef<HTMLParagraphElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (showClose && open) closeButton.current?.focus()
  }, [showClose, open])

  async function send() {
    setStage('sending')
    try {
      const result = await deletion.begin()
      if (result.status === 'rate-limited') {
        setStage('rate-limited')
        return
      }
      setSentIntent(result.intent)
      setStage('ready')
    } catch {
      setStage('send-failed')
    }
  }

  async function confirm(intent: string) {
    setStage('confirming')
    try {
      const result = await deletion.confirm(intent, identity.id)
      if (result !== 'deleted') {
        setStage(result)
        return
      }
      onDeleted()
    } catch {
      setStage('confirm-failed')
    }
  }

  function finishClosing() {
    setOpen(false)
    setSentIntent(undefined)
    setStage('ready')
    onDismiss()
  }

  async function cancel(intent: string) {
    setStage('cancelling')
    try {
      const result = await deletion.cancel(intent, identity.id)
      if (result !== 'cancelled') {
        setStage(result)
        return
      }
      setCancelled(true)
      finishClosing()
    } catch {
      setStage('cancel-failed')
    }
  }

  function changeOpen(nextOpen: boolean) {
    if (busy) return
    if (nextOpen) {
      setCancelled(false)
      setOpen(true)
      return
    }
    if (stage === 'pending' || stage === 'cancel-failed') {
      setOpen(false)
      return
    }
    if (stage !== 'invalid' && activeIntent) {
      void cancel(activeIntent)
      return
    }
    finishClosing()
  }

  return <DialogRoot open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild>
      <Button variant="ghost" disabled={disabled || stage === 'pending'}>Delete account</Button>
    </DialogTrigger>
    {cancelled && <p role="status">Account deletion cancelled.</p>}
    {stage === 'pending' && !open && <p role="status" ref={pendingStatus} tabIndex={-1}>{pendingMessage}</p>}
    <DialogContent aria-describedby={description} className="space-y-3 p-4 sm:p-6" onCloseAutoFocus={event => {
      if (stage !== 'pending') return
      event.preventDefault()
      pendingStatus.current?.focus()
    }}>
      <DialogTitle>Delete account</DialogTitle>
      <p id={description} className="wrap-anywhere">
        Deleting {identity.label} permanently removes the account and its associated data from both apps.
      </p>
      {stage === 'sending' && <p role="status">Sending verification link…</p>}
      {sentIntent && stage === 'ready' && <p role="status">Open the link in this browser, then confirm deletion.</p>}
      {stage === 'send-failed' && <p role="alert">Could not send a verification link. Try again.</p>}
      {stage === 'rate-limited' && <p role="alert">Wait a minute before requesting another verification link.</p>}
      {stage === 'cancelling' && <p role="status">Cancelling account deletion…</p>}
      {stage === 'confirming' && <p role="status">Deleting account…</p>}
      {stage === 'confirm-failed' && <p role="alert">Could not confirm account deletion. Try again.</p>}
      {showClose ? <>
        {stage === 'pending' && <p role="status">{pendingMessage}</p>}
        {stage === 'invalid' && <p role="alert">This deletion request is no longer valid. Request a new link.</p>}
        {stage === 'cancel-failed' && <p role="alert">
          Could not confirm cancellation. The verification link may still be valid.
        </p>}
        <div className="flex flex-wrap gap-2">
          <Button ref={closeButton} variant="outline" onClick={() => changeOpen(false)}>Close</Button>
          {stage === 'cancel-failed' && activeIntent && <Button onClick={() => void cancel(activeIntent)}>Retry cancellation</Button>}
        </div>
      </> : <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => changeOpen(false)}>Cancel</Button>
        {verifiedIntent
          ? <Button disabled={busy} onClick={() => void confirm(verifiedIntent)}>Permanently delete account</Button>
          : <Button disabled={busy || Boolean(sentIntent)} onClick={() => void send()}>Send verification link</Button>}
      </div>}
    </DialogContent>
  </DialogRoot>
}
