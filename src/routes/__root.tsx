import { Outlet, createRootRoute } from '@tanstack/react-router'
import Header from '../components/Header'
import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
