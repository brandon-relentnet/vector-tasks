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
  const [activeTimerEnd, setActiveTimerEnd] = useState<string | null>(null)
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
      {/* TOP ROW: Strategic Intel & Timer */}
      <div className="flex border-b border-border bg-card/50 backdrop-blur-md">
        {/* Briefing Block */}
        <div className="flex-1 p-6 border-r border-border min-w-0 flex items-center gap-6">
          <div className="shrink-0">
             <div className="bg-zinc-900 dark:bg-zinc-950 text-white p-4 rounded-2xl shadow-xl flex items-center gap-6 border-b-4 border-zinc-800">
              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Momentum</p>
                <p className="text-3xl font-black tracking-tighter leading-none">{data.xp} XP</p>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Status</p>
                <p className="text-lg font-black text-primary leading-none uppercase italic">Operative</p>
              </div>
            </div>
          </div>

          {activeBriefing && (
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                <span className="text-primary">{activeBriefing.icon}</span>
                {activeBriefing.title}
              </div>
              <h2 className="text-xl font-black italic tracking-tight leading-tight text-foreground truncate">
                "{activeBriefing.content}"
              </h2>
            </div>
          )}
        </div>

        {/* Timer Block */}
        <div className="w-80 p-6 flex flex-col justify-center bg-zinc-900 dark:bg-zinc-950 text-white border-l-4 border-primary shadow-inner">
           {isTimerActive ? (
              <div className="flex items-center justify-between group h-full">
                <div>
                   <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-1">
                     <Hourglass className="h-2 w-2 text-primary animate-pulse" /> Mission Timer
                   </p>
                   <div className="text-5xl font-black tracking-tighter text-primary italic leading-none font-mono">
                    {timeLeft || '--:--'}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-zinc-500 hover:text-rose-500 hover:bg-zinc-800 rounded-xl" onClick={() => handleTimerAction(null)}>
                  <Square className="h-5 w-5 fill-current" />
                </Button>
              </div>
           ) : (
             <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center justify-between bg-zinc-800/50 rounded-lg p-2 border border-zinc-800">
                  <button onClick={() => setTimerSetupValue(v => Math.max(1, v - 5))} className="text-zinc-500 hover:text-white"><Minus size={16} /></button>
                  <span className="text-2xl font-black font-mono text-white">{timerSetupValue}</span>
                  <button onClick={() => setTimerSetupValue(v => v + 5)} className="text-zinc-500 hover:text-white"><Plus size={16} /></button>
                </div>
                <Button 
                  className="bg-primary text-black font-black uppercase text-[10px] h-10 px-4 shadow-lg active:translate-y-0.5 transition-all"
                  onClick={() => handleTimerAction(timerSetupValue)}
                >
                  Deploy
                </Button>
             </div>
           )}
        </div>
      </div>

      {/* MAIN CONTENT AREA: Project Sidebar + Task Action Grid */}
      <div className="flex-1 flex overflow-hidden bg-background">
        {/* Project Navigation Sidebar */}
        <div className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <LayoutGrid size={12} /> Operational Sectors
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button 
              onClick={() => setSelectedProjectId(null)}
              className={`w-full text-left p-4 rounded-xl transition-all font-black uppercase italic tracking-tighter text-sm flex items-center justify-between ${!selectedProjectId ? 'bg-primary text-zinc-900 shadow-lg' : 'hover:bg-muted text-muted-foreground'}`}
            >
              All Quests
              <Badge variant="outline" className={`text-[10px] border-zinc-800/20 ${!selectedProjectId ? 'bg-zinc-900/10 text-zinc-900 border-zinc-900/30' : ''}`}>
                {data.quests.length}
              </Badge>
            </button>
            {data?.projects?.map((project: any) => (
              <button 
                key={project.id} 
                onClick={() => setSelectedProjectId(project.id)}
                className={`w-full text-left p-4 rounded-xl transition-all font-black uppercase italic tracking-tighter text-sm flex items-center justify-between group ${selectedProjectId === project.id ? 'bg-primary text-zinc-900 shadow-lg' : 'hover:bg-muted text-muted-foreground'}`}
              >
                {project.name}
                <Badge variant="outline" className={`text-[10px] border-zinc-800/20 ${selectedProjectId === project.id ? 'bg-zinc-900/10 text-zinc-900 border-zinc-900/30' : ''}`}>
                  {project.active_count}
                </Badge>
              </button>
            ))}
          </div>
          <div className="p-4 bg-muted/30 border-t border-border">
             <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase mb-2">
               <Wifi size={10} className={isConnected ? 'text-primary' : 'text-rose-500'} /> 
               Comms: {isConnected ? 'Stable' : 'Offline'}
             </div>
             <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Vector Core v1.2</div>
          </div>
        </div>

        {/* Task Grid / Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50/30 dark:bg-zinc-950/30">
          <div className="p-6 border-b border-border bg-background flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black uppercase tracking-tight italic">
                {selectedProjectId ? data.projects.find((p:any)=>p.id === selectedProjectId)?.name : "Current Objectives"}
              </h2>
              {selectedProjectId && <div className="h-4 w-1 bg-primary rounded-full" />}
            </div>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="font-black uppercase tracking-widest text-[10px] h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-primary dark:text-black">
              <Plus className="h-4 w-4 mr-2" /> New Quest
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <Card className="border-2 border-border shadow-sm rounded-2xl overflow-hidden bg-card">
              <CardContent className="p-0">
                {isAdding && (
                  <form onSubmit={handleCreateTask} className="p-6 border-b-2 border-dashed border-border bg-muted flex gap-4 items-end animate-in fade-in slide-in-from-top-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Objective</label>
                      <input autoFocus className="w-full bg-card border-2 border-border rounded-xl px-4 py-3 font-bold focus:border-primary outline-none transition-all" placeholder="Describe mission..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
                    </div>
                    <Button type="submit" className="bg-primary text-zinc-900 font-black uppercase tracking-widest text-[10px] h-12 px-6">Deploy</Button>
                    <Button type="button" variant="ghost" className="h-12 w-12 text-muted-foreground" onClick={() => setIsAdding(false)}><X className="h-5 w-5" /></Button>
                  </form>
                )}

                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Objective</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground w-24">Priority</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Protocol</TableHead>
                      <TableHead className="text-right w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuests.length > 0 ? filteredQuests.map((quest: any) => (
                      <TableRow key={quest.id} className="group hover:bg-muted/20 transition-colors border-b border-border last:border-0">
                        <TableCell className="py-5 px-6">
                          <p className="font-black text-lg tracking-tighter text-foreground leading-none uppercase italic">{quest.title}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-black italic uppercase text-[9px] px-2 border-2 ${quest.priority === 'High' ? 'border-zinc-900 bg-zinc-900 dark:bg-zinc-800 text-primary' : 'border-border text-muted-foreground'}`}>
                            {quest.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                            <div className={`h-2 w-2 rounded-full ${quest.status === 'Working' ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                            {quest.status}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {quest.status === 'Todo' && (
                              <Button variant="outline" size="sm" className="h-8 bg-card hover:bg-foreground hover:text-background border-2 border-foreground font-black text-[9px] px-3 transition-all" onClick={() => handleStatusUpdate(quest.id, 'Working')}>
                                START
                              </Button>
                            )}
                            {quest.status === 'Working' && (
                              <>
                                <Button variant="outline" size="sm" className="h-8 bg-primary hover:bg-foreground hover:text-background text-zinc-900 border-2 border-primary font-black text-[9px] px-3 transition-all" onClick={() => handleStatusUpdate(quest.id, 'Done')}>
                                  FINISH
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                                  <Pause size={14} />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="sm" className="text-muted/20 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(quest.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-20 text-center text-muted-foreground font-black uppercase italic opacity-30">Sector Clear</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recently Done (History) inside the work zone but at the bottom */}
            {data.history && data.history.length > 0 && (
              <div className="mt-12 space-y-4 pb-10">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <History size={12} /> Mission Success Record
                </h3>
                <div className="grid gap-2 opacity-50 hover:opacity-100 transition-opacity">
                  {data.history.map((quest: any) => (
                    <div key={quest.id} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between group">
                      <span className="line-through text-muted-foreground italic font-bold text-sm tracking-tight">{quest.title}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black tracking-widest hover:text-primary" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>UNDO</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-rose-500" onClick={() => handleDeleteTask(quest.id)}><Trash2 size={14} /></Button>
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
