import { lazy, Suspense } from 'react'
import { PlaygroundHome } from './playground-home'
import { RouteLoading } from './route-loading'

const QuranReader = lazy(() => import('../prototypes/quran/quran-reader'))
const SupabaseDemo = lazy(() => import('../prototypes/supabase/supabase-demo'))
export default function App() {
  const route = window.location.pathname.split('/').filter(Boolean).at(-1)

  if (route === 'quran') {
    return (
      <Suspense fallback={<RouteLoading title="Quran reader" message="Loading Quran reader…" />}>
        <QuranReader />
      </Suspense>
    )
  }
  if (route === 'supabase') {
    return (
      <Suspense fallback={<RouteLoading title="Supabase API demo" message="Loading Supabase demo…" />}>
        <SupabaseDemo />
      </Suspense>
    )
  }
  return <PlaygroundHome />
}
