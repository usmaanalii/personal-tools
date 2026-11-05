import './home.css'

type RouteLoadingProps = {
  /** Destination name displayed while its JavaScript loads. */
  title: string
  /** Polite loading announcement specific to the destination. */
  message: string
}

export function RouteLoading({ title, message }: RouteLoadingProps) {
  return (
    <main className="playground-shell grid min-h-dvh content-start bg-ui-background px-6 py-12 font-ui-body text-ui-foreground sm:content-center">
      <div className="mx-auto w-full max-w-[40rem]">
        <a className="mb-6 inline-flex min-h-11 items-center text-ui-primary underline-offset-[.2em] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ui-focus" href={import.meta.env.BASE_URL}>← All playground pages</a>
        <h1 className="m-0 font-ui-heading text-3xl leading-tight font-bold">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-ui-muted" role="status">{message}</p>
      </div>
    </main>
  )
}
