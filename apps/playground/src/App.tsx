import QuranReader from './QuranReader'
import SupabaseDemo from './SupabaseDemo'
import './home.css'

const basePath = import.meta.env.BASE_URL

function PlaygroundHome() {
  return (
    <main className="playground-home">
      <div className="home-content">
        <p className="home-eyebrow">PERSONAL TOOLS</p>
        <h1>Playground</h1>
        <p className="home-intro">A small collection of ideas and experiments. Choose a page to explore.</p>
        <nav className="playground-links" aria-label="Playground pages">
          <a href={`${basePath}quran/`}>
            <span className="page-icon" aria-hidden="true">۞</span>
            <span><strong>Quran reader</strong><small>Explore chapters and read verses in a calm, phone-first layout.</small></span>
            <span className="page-arrow" aria-hidden="true">→</span>
          </a>
          <a href={`${basePath}supabase/`}>
            <span className="page-icon api-icon" aria-hidden="true">↗</span>
            <span><strong>Supabase API demo</strong><small>Send a request to a public Edge Function and inspect its response.</small></span>
            <span className="page-arrow" aria-hidden="true">→</span>
          </a>
        </nav>
      </div>
    </main>
  )
}

export default function App() {
  const route = window.location.pathname.split('/').filter(Boolean).at(-1)

  if (route === 'quran') return <QuranReader />
  if (route === 'supabase') return <SupabaseDemo />
  return <PlaygroundHome />
}
