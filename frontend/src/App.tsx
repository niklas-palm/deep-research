import { lazy, Suspense, useEffect, useState } from 'react'
import { Dashboard } from './pages/Dashboard'

const HowItWorks = lazy(() =>
  import('./pages/HowItWorks').then((m) => ({ default: m.HowItWorks }))
)

function currentRoute(): string {
  return window.location.hash.replace(/^#\/?/, '')
}

export default function App() {
  const [route, setRoute] = useState(currentRoute())

  useEffect(() => {
    const onChange = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  if (route === 'how-it-works') {
    return (
      <Suspense fallback={null}>
        <HowItWorks />
      </Suspense>
    )
  }

  return <Dashboard />
}
