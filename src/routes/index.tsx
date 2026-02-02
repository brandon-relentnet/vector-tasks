import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardData, updateTaskStatus, createTask, deleteTask } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle2, RotateCcw, Pause, History, Plus, Trash2, X, Wifi, WifiOff, Sparkles, Moon, Zap, LogOut, Clock, Target, Hourglass, Square, Minus, LayoutGrid } from 'lucide-react'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const data = await getDashboardData()
      return data
    } catch (error) {
      console.error('Loader error:', error)
      return { xp: 0, quests: [], history: [], projects: [] }
    }
  },
  component: Dashboard,
})

function Dashboard() {
  const data = Route.useLoaderData()
  const router = useRouter()
  
  // UI States
  const [isAdding, setIsAdding] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  // Timer States
  const [timerSetupValue, setTimerSetupValue] = useState(25)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)
  const [localTimerEnd, setLocalTimerEnd] = useState<string | null>(null)

  // Timer logic
  useEffect(() => {
    const activeEnd = localTimerEnd || data.dailyLog?.timer_end;
    if (!activeEnd) {
      setTimeLeft(null)
      return
    }
    const timer = setInterval(() => {
      const end = new Date(activeEnd).getTime()
      const now = Date.now()
      const distance = end - now
      if (distance < 0) {
        clearInterval(timer)
        setTimeLeft("00:00")
        setLocalTimerEnd(null)
      } else {
        const m = Math.floor((distance % 3600000) / 60000)
        const s = Math.floor((distance % 60000) / 1000)
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [data.dailyLog?.timer_end, localTimerEnd])

  useEffect(() => {
    const socket = io('http://localhost:8000')
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('update', () => {
        setLocalTimerEnd(null)
        router.invalidate()
    })
    return () => { socket.disconnect() }
  }, [router])

  const handleTimerAction = async (minutes: number | null) => {
    const newEnd = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null
    setLocalTimerEnd(newEnd)
    if (!newEnd) setTimeLeft(null)
    try {
      await axios.post('http://localhost:8000/daily-log/update', {
        id: data.dailyLog.id,
        date: data.dailyLog.date,
        timer_end: newEnd
      })
    } catch (error) {
      setLocalTimerEnd(null) 
      router.invalidate()
    }
  }

  const handleStatusUpdate = async (taskId: number, newStatus: string) => {
    try { await updateTaskStatus(taskId, newStatus) } catch (error) { console.error(error) }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    try {
      await createTask({
        title: newTaskTitle,
        project_id: selectedProjectId || data.projects[0]?.id,
        status: 'Todo',
        priority: 'Med'
      })
      setNewTaskTitle('')
      setIsAdding(false)
    } catch (error) { console.error(error) }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Delete quest?')) return
    try { await deleteTask(taskId) } catch (error) { console.error(error) }
  }

  const getActiveBriefing = () => {
    if (!data.dailyLog) return null;
    if (data.dailyLog.nightly_reflection) return { type: 'night', icon: <Moon className="h-5 w-5" />, title: 'Nightly Reflection', content: data.dailyLog.nightly_reflection };
    if (data.dailyLog.shutdown_briefing) return { type: 'shutdown', icon: <LogOut className="h-5 w-5" />, title: 'Shutdown Ritual', content: data.dailyLog.shutdown_briefing };
    if (data.dailyLog.midday_briefing) return { type: 'midday', icon: <Zap className="h-5 w-5" />, title: 'Mid-Day Pivot', content: data.dailyLog.midday_briefing };
    return { type: 'morning', icon: <Sparkles className="h-5 w-5" />, title: 'Strategic Briefing', content: data.dailyLog.morning_briefing || "Awaiting intelligence briefing..." };
  }

  const activeBriefing = getActiveBriefing();
  const filteredQuests = selectedProjectId 
    ? data.quests.filter((q: any) => q.project_id === selectedProjectId)
    : data.quests;

  const isTimerActive = !!(localTimerEnd || data.dailyLog?.timer_end);

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col overflow-hidden text-foreground">
      {/* TOP ROW: Integrated Command Bar */}
      <div className="flex border-b border-border bg-card/80 backdrop-blur-xl h-24 overflow-hidden shadow-sm">
        {/* Left Section: Active Strategic Orders */}
        <div className="flex-1 p-6 min-w-0 flex items-center">
          {activeBriefing ? (
            <div className="flex items-center gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="bg-muted p-3 rounded-2xl border border-border shadow-inner shrink-0">
                <span className="text-primary">{activeBriefing.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  {activeBriefing.title} // Active Orders
                </p>
                <h2 className="text-2xl font-black italic tracking-tight leading-none text-foreground truncate max-w-2xl">
                  "{activeBriefing.content}"
                </h2>
              </div>
            </div>
          ) : (
            <div className="animate-pulse flex items-center gap-4 text-muted-foreground italic font-medium">
               Awaiting tactical synchronization...
            </div>
          )}
        </div>

        {/* Right Section: Tactical Modules (Timer & XP) */}
        <div className="flex shrink-0">
          {/* XP Module */}
          <div className="px-8 border-l border-border flex flex-col justify-center items-end bg-zinc-50/50 dark:bg-zinc-950/20">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1">Momentum</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black tracking-tighter leading-none">{data.xp}</span>
              <span className="text-[10px] font-black uppercase text-primary mb-1">XP</span>
            </div>
          </div>

          {/* Timer Module */}
          <div className="w-80 px-8 border-l border-border flex flex-col justify-center bg-zinc-900 dark:bg-zinc-950 text-white relative">
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
              {isTimerActive ? <Hourglass size={60} className="text-primary animate-pulse" /> : <Clock size={60} className="text-white" />}
            </div>
            
            {isTimerActive ? (
              <div className="flex items-center justify-between group relative z-10">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">Deployment</p>
                  <div className="text-4xl font-black tracking-tighter text-primary italic leading-none font-mono">
                    {timeLeft || '--:--'}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-zinc-500 hover:text-rose-500 hover:bg-zinc-800 rounded-xl" onClick={() => handleTimerAction(null)}>
                  <Square className="h-5 w-5 fill-current" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4 relative z-10">
                <div className="flex-1 flex items-center justify-between bg-zinc-800/80 rounded-xl p-2 border border-zinc-700/50">
                  <button onClick={() => setTimerSetupValue(v => Math.max(1, v - 5))} className="text-zinc-500 hover:text-primary transition-colors"><Minus size={18} /></button>
                  <span className="text-3xl font-black font-mono text-white leading-none">{timerSetupValue}</span>
                  <button onClick={() => setTimerSetupValue(v => v + 5)} className="text-zinc-500 hover:text-primary transition-colors"><Plus size={18} /></button>
                </div>
                <Button 
                  className="bg-primary text-black font-black uppercase text-[10px] h-12 px-6 rounded-xl shadow-[0_4px_15px_rgba(255,190,0,0.15)] hover:shadow-[0_4px_20px_rgba(255,190,0,0.3)] transition-all"
                  onClick={() => handleTimerAction(timerSetupValue)}
                >
                  Launch
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden bg-background">
        {/* Project Navigation Sidebar */}
        <div className="w-64 border-r border-border bg-card flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
          <div className="p-6 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <LayoutGrid size={12} /> Sectors
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button 
              onClick={() => setSelectedProjectId(null)}
              className={`w-full text-left p-4 rounded-xl transition-all font-black uppercase italic tracking-tighter text-sm flex items-center justify-between ${!selectedProjectId ? 'bg-zinc-900 text-primary shadow-xl scale-[1.02] dark:bg-primary dark:text-black' : 'hover:bg-muted text-muted-foreground'}`}
            >
              Master Feed
              <Badge variant="outline" className={`text-[10px] border-current opacity-50`}>
                {data.quests.length}
              </Badge>
            </button>
            <div className="h-px bg-border my-2 mx-2 opacity-50" />
            {data?.projects?.map((project: any) => (
              <button 
                key={project.id} 
                onClick={() => setSelectedProjectId(project.id)}
                className={`w-full text-left p-4 rounded-xl transition-all font-black uppercase italic tracking-tighter text-sm flex items-center justify-between group ${selectedProjectId === project.id ? 'bg-zinc-900 text-primary shadow-xl scale-[1.02] dark:bg-primary dark:text-black' : 'hover:bg-muted text-muted-foreground'}`}
              >
                {project.name}
                <Badge variant="outline" className={`text-[10px] border-current opacity-50`}>
                  {project.active_count}
                </Badge>
              </button>
            ))}
          </div>
          <div className="p-6 bg-muted/20 border-t border-border mt-auto">
             <div className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
               <Wifi size={10} className={isConnected ? 'text-primary' : 'text-rose-500'} /> 
               Status: {isConnected ? 'Synchronized' : 'Standalone'}
             </div>
             <div className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">Vector Command Core v1.2</div>
          </div>
        </div>

        {/* Task Grid / Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50/20 dark:bg-zinc-950/10">
          <div className="p-6 border-b border-border bg-background/50 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black uppercase tracking-tight italic text-foreground">
                {selectedProjectId ? data.projects.find((p:any)=>p.id === selectedProjectId)?.name : "Active Operations"}
              </h2>
            </div>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="font-black uppercase tracking-widest text-[10px] h-10 px-6 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-primary dark:text-black rounded-xl shadow-lg transition-all active:scale-95">
              <Plus className="h-4 w-4 mr-2 text-primary" /> New Objective
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
            <Card className="border-2 border-border shadow-xl rounded-3xl overflow-hidden bg-card">
              <CardContent className="p-0">
                {isAdding && (
                  <form onSubmit={handleCreateTask} className="p-10 border-b-2 border-dashed border-border bg-muted/30 flex gap-6 items-end animate-in fade-in slide-in-from-top-6 duration-500">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Operational Objective</label>
                      <input autoFocus className="w-full bg-card border-2 border-border rounded-2xl px-6 py-4 text-lg font-black focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all" placeholder="Enter mission parameters..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
                    </div>
                    <div className="flex gap-2 mb-1">
                      <Button type="submit" className="bg-primary text-black font-black uppercase tracking-widest text-[10px] h-14 px-8 rounded-2xl shadow-xl">Deploy</Button>
                      <Button type="button" variant="ghost" className="h-14 w-14 rounded-2xl text-muted-foreground hover:bg-rose-50 hover:text-rose-500" onClick={() => setIsAdding(false)}><X size={24} /></Button>
                    </div>
                  </form>
                )}

                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-b-2 border-border">
                      <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Objective</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 w-32">Priority</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 text-center">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 text-center w-40">Protocol</TableHead>
                      <TableHead className="text-right w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuests.length > 0 ? filteredQuests.map((quest: any) => (
                      <TableRow key={quest.id} className="group hover:bg-muted/30 transition-all border-b border-border last:border-0 h-24">
                        <TableCell className="py-0 px-8">
                          <p className="font-black text-xl tracking-tighter text-foreground leading-none group-hover:text-primary transition-colors uppercase italic">{quest.title}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-black italic uppercase text-[10px] px-3 py-1 border-2 ${quest.priority === 'High' ? 'border-zinc-900 bg-zinc-900 dark:bg-zinc-800 text-primary' : 'border-border text-muted-foreground'}`}>
                            {quest.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2.5 font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                            <div className={`h-2.5 w-2.5 rounded-full ${quest.status === 'Working' ? 'bg-primary shadow-[0_0_10px_var(--primary)] animate-pulse' : 'bg-muted-foreground/30'}`} />
                            {quest.status}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2 scale-90 group-hover:scale-100 transition-transform">
                            {quest.status === 'Todo' && (
                              <Button variant="outline" size="sm" className="h-10 bg-card hover:bg-zinc-900 hover:text-primary dark:hover:bg-primary dark:hover:text-black border-2 border-zinc-900 dark:border-border font-black text-[10px] tracking-[0.1em] px-5 rounded-xl transition-all" onClick={() => handleStatusUpdate(quest.id, 'Working')}>
                                START
                              </Button>
                            )}
                            {quest.status === 'Working' && (
                              <>
                                <Button variant="outline" size="sm" className="h-10 bg-primary hover:bg-zinc-900 hover:text-primary text-zinc-900 border-2 border-primary font-black text-[10px] tracking-[0.1em] px-5 rounded-xl transition-all" onClick={() => handleStatusUpdate(quest.id, 'Done')}>
                                  FINISH
                                </Button>
                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                                  <Pause size={18} />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button variant="ghost" size="sm" className="text-muted/20 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(quest.id)}>
                            <Trash2 size={18} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-32 text-center text-muted-foreground font-black uppercase tracking-[0.2em] italic opacity-30">All Objectives Secured</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {data.history && data.history.length > 0 && (
              <div className="mt-16 space-y-6 pb-20">
                <div className="flex items-center gap-4">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
                    <History size={14} /> Mission Record
                  </h3>
                  <div className="h-px flex-1 bg-border opacity-30" />
                </div>
                <div className="grid gap-3 opacity-40 hover:opacity-100 transition-all duration-500">
                  {data.history.map((quest: any) => (
                    <div key={quest.id} className="bg-card border-2 border-border p-5 rounded-2xl flex items-center justify-between group shadow-sm hover:shadow-md transition-all">
                      <span className="line-through text-muted-foreground italic font-black text-base tracking-tighter uppercase">{quest.title}</span>
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <Button variant="outline" size="sm" className="h-8 text-[9px] font-black tracking-widest border-2 border-zinc-200 hover:border-zinc-900 rounded-lg px-4" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>RESTORE</Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg" onClick={() => handleDeleteTask(quest.id)}><Trash2 size={16} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
