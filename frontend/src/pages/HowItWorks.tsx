import { PresentationApp } from 'unfold-ai'
import { presentation } from '../presentation/presentation'

export function HowItWorks() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <PresentationApp presentation={presentation} />
    </div>
  )
}
