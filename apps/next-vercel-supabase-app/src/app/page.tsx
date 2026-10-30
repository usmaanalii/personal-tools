import { ConnectionCheck } from '../components/connection-check'

export default function Home() {
  return (
    <main id="main-content">
      <header className="page-header">
        <span className="wordmark">PERSONAL TOOLS / LAB 02</span>
        <span className="stack-label">Next.js + Supabase</span>
      </header>
      <div className="intro">
        <p className="eyebrow">A SMALL APP. A REAL CONNECTION.</p>
        <h1>Next.js connection lab</h1>
        <p>
          A place to prove the path from a page to a backend, and from a local
          build to a live app.
        </p>
      </div>
      <ConnectionCheck />
      <footer>
        Built independently. Part of the Personal Tools workspace.
      </footer>
    </main>
  )
}
