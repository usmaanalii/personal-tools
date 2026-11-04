import './home.css'

const basePath = import.meta.env.BASE_URL

export function PlaygroundHome() {
  return (
    <main className="playground-shell grid min-h-dvh content-start bg-ui-background px-6 py-12 font-ui-body text-ui-foreground sm:content-center">
      <div className="mx-auto w-full max-w-[40rem]">
        <p className="m-0 mb-3 text-xs font-bold tracking-widest text-ui-muted">PERSONAL TOOLS</p>
        <h1 className="m-0 font-ui-heading text-4xl leading-tight font-bold sm:text-5xl">Playground</h1>
        <p className="mt-4 mb-6 max-w-[32rem] text-base leading-relaxed text-ui-muted">A small collection of ideas and experiments. Choose a page to explore.</p>
        <nav className="grid gap-4" aria-label="Playground pages">
          <a className="playground-page-link" href={`${basePath}quran/`}>
            <span className="min-w-0"><strong className="block text-base font-semibold">Quran reader</strong><small className="mt-2 block text-sm leading-relaxed text-ui-muted">Explore chapters and read verses in a calm, phone-first layout.</small></span>
            <span className="text-xl text-ui-primary" aria-hidden="true">→</span>
          </a>
          <a className="playground-page-link" href={`${basePath}supabase/`}>
            <span className="min-w-0"><strong className="block text-base font-semibold">Supabase API demo</strong><small className="mt-2 block text-sm leading-relaxed text-ui-muted">Send a request to a public Edge Function and inspect its response.</small></span>
            <span className="text-xl text-ui-primary" aria-hidden="true">→</span>
          </a>
        </nav>
      </div>
    </main>
  )
}
