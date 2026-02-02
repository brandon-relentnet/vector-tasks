import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { getDashboardData } from '../data/dashboard-fns'
import {
  Home,
  Menu,
  Sparkles,
  X,
  Target,
  Sun,
  Moon,
  Clock,
  Hourglass,
} from 'lucide-react'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('theme') === 'dark'
    }
    return false
  })
  
  const [xp, setXp] = useState(0)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)
  const [timerEnd, setTimerEnd] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false)

  // Fetch Data (Poll every 5s + Socket)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardData()
        setXp(data.xp)
        
        if (data.dailyLog?.timer_end) {
          setTimerEnd(new Date(data.dailyLog.timer_end).getTime())
          setTimerActive(true)
        } else {
          setTimerEnd(null)
          setTimerActive(false)
          setTimeLeft(null)
        }
      } catch (e) { console.error(e) }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000) 

    // Socket.IO for instant updates
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8000')
    socket.on('update', () => {
      fetchData()
    })

    return () => { 
      clearInterval(interval)
      socket.disconnect()
    }
  }, [])

  // Local Ticker (Runs every 1s)
  useEffect(() => {
    if (!timerEnd) return

    const tick = () => {
      const now = Date.now()
      const distance = timerEnd - now
      if (distance > 0) {
        const m = Math.floor((distance % 3600000) / 60000)
        const s = Math.floor((distance % 60000) / 1000)
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
      } else {
        setTimeLeft("00:00")
      }
    }

    tick() // Immediate update
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [timerEnd])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleDarkMode = () => setIsDark(!isDark)

  return (
    <>
      <header className="p-4 flex items-center justify-between bg-zinc-950 text-white shadow-2xl border-b border-zinc-800 sticky top-0 z-40 h-[65px]">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-all active:scale-95"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-primary" />
          </button>
          <div className="ml-4 flex items-center gap-3">
            <div className="bg-primary h-9 w-9 rounded-lg flex items-center justify-center font-black text-black shadow-[0_0_15px_rgba(255,190,0,0.3)]">V</div>
            <div className="flex flex-col -space-y-1 hidden md:flex">
              <span className="text-lg font-black tracking-tighter uppercase italic text-white">Vector</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Command Center</span>
            </div>
          </div>
        </div>

        {/* Global Performance HUD on Navbar Right */}
        <div className="flex items-center gap-6">
          {/* Global XP */}
          <div className="flex flex-col items-end border-r border-zinc-800 pr-6">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500">Global Momentum</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black italic text-white">{xp}</span>
              <span className="text-[10px] font-black text-primary">XP</span>
            </div>
          </div>

          {/* Global Timer Display */}
          <div className="flex items-center gap-3 bg-zinc-900 px-4 py-1.5 rounded-xl border border-zinc-800 shadow-inner min-w-[120px]">
            {timerActive ? <Hourglass size={14} className="text-primary animate-pulse" /> : <Clock size={14} className="text-zinc-500" />}
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-widest text-zinc-500 leading-none">Clock</span>
              <span className={`text-sm font-black font-mono leading-none mt-0.5 ${timerActive ? 'text-primary italic' : 'text-zinc-600'}`}>
                {timeLeft || 'STANDBY'}
              </span>
            </div>
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

        <div className="p-6 border-t border-zinc-900 space-y-6">
          <button 
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all group"
          >
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon size={18} className="text-indigo-400" />
              ) : (
                <Sun size={18} className="text-amber-400" />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-200">
                {isDark ? 'Stealth Mode' : 'Direct Light'}
              </span>
            </div>
            <div className={`w-10 h-5 rounded-full p-1 transition-colors ${isDark ? 'bg-primary' : 'bg-zinc-700'}`}>
              <div className={`w-3 h-3 bg-black rounded-full transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>

          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Vector Command v1.2</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-700 mt-1">Status: Online</p>
          </div>
        </div>
      </aside>
    </>
  )
}
