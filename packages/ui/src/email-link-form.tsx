'use client'

import { useId, useRef, useState } from 'react'
import { Button } from './button'
import { Input } from './input'

export function EmailLinkForm({
  requestLink,
  disabled,
}: {
  readonly requestLink: (email: string) => Promise<'accepted' | 'rate-limited'>
  readonly disabled?: boolean
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<
    'idle' | 'sending' | 'accepted' | 'failed' | 'rate-limited' | 'offline'
  >('idle')
  const pending = phase === 'sending'

  async function send(email: string) {
    if (!navigator.onLine) {
      setPhase('offline')
      return
    }
    setPhase('sending')
    try {
      setPhase(await requestLink(email))
    } catch {
      setPhase('failed')
    }
  }

  function close() {
    setOpen(false)
    setPhase('idle')
    trigger.current?.focus()
  }

  return (
    <div className="mt-2">
      <Button
        type="button"
        ref={trigger}
        variant="outline"
        aria-expanded={open}
        disabled={disabled || pending}
        onClick={() => {
          if (open) close()
          else setOpen(true)
        }}
      >
        Sign in with email
      </Button>
      {open && (
        <form
          className="mt-3 grid max-w-sm gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const email = new FormData(event.currentTarget).get('email')
            if (typeof email === 'string' && !pending && !disabled)
              void send(email)
          }}
        >
          <label htmlFor={id}>Email address</label>
          <Input
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby={`${id}-identity`}
            required
            readOnly={pending}
            ref={focusInput}
          />
          <p id={`${id}-identity`} className="m-0 text-sm">
            If you use the same verified address for Google and email, both
            methods may sign you into the same account.
          </p>
          <Button type="submit" disabled={disabled || pending}>
            {phase === 'accepted' ? 'Resend sign-in link' : 'Send sign-in link'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={close}
          >
            Cancel
          </Button>
          {pending && <p role="status">Sending sign-in link…</p>}
          {phase === 'accepted' && (
            <p role="status">
              If a link can be sent, check your email and open it in this
              browser.
            </p>
          )}
          {phase === 'failed' && (
            <p role="alert">Could not send a sign-in link. Try again.</p>
          )}
          {phase === 'rate-limited' && (
            <p role="alert">Too many requests. Wait a minute and try again.</p>
          )}
          {phase === 'offline' && (
            <p role="alert">You’re offline. Reconnect and try again.</p>
          )}
        </form>
      )}
    </div>
  )
}

function focusInput(input: HTMLInputElement | null) {
  input?.focus()
}
