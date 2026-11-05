import { ConnectionCheck } from '../components/connection-check'

export default function Home() {
  return (
    <main id="main-content" className="mx-auto w-[min(100%_-_3rem,64rem)]">
      <header className="flex flex-wrap justify-between gap-4 border-0 border-b border-solid border-ui-border py-8">
        <span className="font-mono text-[.8rem] tracking-[.07em]">
          PERSONAL TOOLS / LAB 02
        </span>
        <span className="font-mono text-[.8rem] tracking-[.07em] text-ui-primary">
          Next.js + Supabase
        </span>
      </header>
      <div className="max-w-[46rem] pt-[clamp(2.5rem,8vw,6rem)] pb-8">
        <p className="max-w-[40rem] font-mono text-[.8rem] tracking-[.07em] text-ui-primary">
          A SMALL APP. A REAL CONNECTION.
        </p>
        <h1 className="mt-4 mb-6 text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.08] tracking-[-.045em] text-balance">
          Next.js connection lab
        </h1>
        <p className="max-w-[40rem] text-[1.15rem] text-ui-muted">
          A place to prove the path from a page to a backend, and from a local
          build to a live app.
        </p>
      </div>
      <ConnectionCheck />
      <footer className="pt-8 pb-12 text-[.85rem] text-ui-muted">
        Built independently. Part of the Personal Tools workspace.
      </footer>
    </main>
  )
}
