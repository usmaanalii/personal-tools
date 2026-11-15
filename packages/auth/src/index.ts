export type Identity = {
  /** An opaque account identifier. Applications must never match accounts by label. */
  readonly id: string
  readonly label: string
}

export type Session =
  | { readonly status: 'guest' }
  | { readonly status: 'authenticated'; readonly identity: Identity }

export interface Auth {
  /** Delivers the current session and subsequent changes until unsubscribed. */
  observeSession(listener: (session: Session) => void): () => void
  signIn(): Promise<void>
  signOut(): Promise<void>
}
