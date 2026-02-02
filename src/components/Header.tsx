import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Home,
  Menu,
  Sparkles,
  X,
  Target,
} from 'lucide-react'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <header className="p-4 flex items-center bg-zinc-950 text-white shadow-2xl border-b border-zinc-800 sticky top-0 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-zinc-800 rounded-xl transition-all active:scale-95"
          aria-label="Open menu"
        >
          <Menu size={24} className="text-primary" />
        </button>
        <div className="ml-4 flex items-center gap-3">
          <div className="bg-primary h-9 w-9 rounded-lg flex items-center justify-center font-black text-black shadow-[0_0_15px_rgba(255,190,0,0.3)]">V</div>
          <div className="flex flex-col -space-y-1">
            <span className="text-lg font-black tracking-tighter uppercase italic">Vector</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Command Center</span>
          </div>
        </div>
      </header>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-zinc-950 text-white shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-50 transform transition-transform duration-500 ease-in-out flex flex-col border-r border-zinc-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-8 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-widest italic">Navigation</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-4">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-900 transition-all group border border-transparent hover:border-zinc-800"
            activeProps={{
              className:
                'flex items-center gap-4 p-4 rounded-xl bg-primary text-black transition-all shadow-[0_5px_15px_rgba(255,190,0,0.2)] font-bold',
            }}
          >
            <Home size={22} className="group-hover:scale-110 transition-transform" />
            <span className="uppercase tracking-widest text-sm font-black">Dashboard</span>
          </Link>

          <Link
            to="/briefings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-900 transition-all group border border-transparent hover:border-zinc-800"
            activeProps={{
              className:
                'flex items-center gap-4 p-4 rounded-xl bg-primary text-black transition-all shadow-[0_5px_15px_rgba(255,190,0,0.2)] font-bold',
            }}
          >
            <Sparkles size={22} className="group-hover:scale-110 transition-transform" />
            <span className="uppercase tracking-widest text-sm font-black">Archives</span>
          </Link>
        </nav>

        <div className="p-8 border-t border-zinc-900 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Vector Command v1.2</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-700 mt-1">Operative Status: Online</p>
        </div>
      </aside>
    </>
  )
}
