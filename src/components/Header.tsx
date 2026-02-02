import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Home,
  Menu,
  Sparkles,
  X,
} from 'lucide-react'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <header className="p-4 flex items-center bg-zinc-900 text-white shadow-lg">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <div className="ml-4 flex items-center gap-2">
          <div className="bg-primary h-8 w-8 rounded flex items-center justify-center font-black text-black">V</div>
          <span className="text-xl font-bold tracking-tight uppercase">Vector Command</span>
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-zinc-950 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold uppercase tracking-widest">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-4 rounded-lg hover:bg-zinc-800 transition-colors mb-2 group"
            activeProps={{
              className:
                'flex items-center gap-3 p-4 rounded-lg bg-primary text-black transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span className="font-bold">Command Center</span>
          </Link>

          <Link
            to="/briefings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-4 rounded-lg hover:bg-zinc-800 transition-colors mb-2 group"
            activeProps={{
              className:
                'flex items-center gap-3 p-4 rounded-lg bg-primary text-black transition-colors mb-2',
            }}
          >
            <Sparkles size={20} />
            <span className="font-bold">Mission Archives</span>
          </Link>
        </nav>
      </aside>
    </>
  )
}
