import { Outlet, createRootRoute } from '@tanstack/react-router'
import Header from '../components/Header'
import StarParticles from '../components/StarParticles'
import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="isolate relative min-h-screen">
      <StarParticles />
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
