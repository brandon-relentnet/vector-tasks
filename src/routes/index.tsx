import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardData, updateTaskStatus, createTask, deleteTask } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle2, RotateCcw, Pause, History, Plus, Trash2, X, Wifi, WifiOff, Sparkles, Moon, Zap, LogOut, Clock, Target, Hourglass, Square, Settings } from 'lucide-react'
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
  const [isAdding, setIsAdding] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)
  const [isTimerInputOpen, setIsTimerInputOpen] = useState(false)
  const [customTimerMinutes, setCustomTimerMinutes] = useState('15')

  // Timer logic
  useEffect(() => {
    if (!data.dailyLog?.timer_end) {
      setTimeLeft(null)
      return
    }

    const timer = setInterval(() => {
      const end = new Date(data.dailyLog.timer_end).getTime()
      const now = new Date().getTime()
      const distance = end - now

      if (distance < 0) {
        clearInterval(timer)
        setTimeLeft("00:00")
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [data.dailyLog?.timer_end])

  useEffect(() => {
    const socket = io('http://localhost:8000')
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('update', () => router.invalidate())
    return () => { socket.disconnect() }
  }, [router])

  const handleStatusUpdate = async (taskId: number, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
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
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this quest?')) return
    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const updateTimer = async (minutes: number | null) => {
    try {
      const timer_end = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null
      await axios.post('http://localhost:8000/daily-log/update', {
        id: data.dailyLog.id,
        date: data.dailyLog.date,
        timer_end
      })
      setIsTimerInputOpen(false)
    } catch (error) {
      console.error('Failed to update timer:', error)
    }
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

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto pb-20 text-foreground">
      <header className="flex justify-between items-center border-b pb-6 border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-zinc-900 dark:text-zinc-50">Vector Command</h1>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border`}>
              <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-primary animate-pulse shadow-[0_0_5px_var(--primary)]' : 'bg-rose-500'}`} />
              {isConnected ? 'Link Active' : 'Offline'}
            </div>
          </div>
          <p className="text-muted-foreground font-medium tracking-tight uppercase text-xs opacity-70">System Status: Nominal</p>
        </div>
        <div className="bg-zinc-900 dark:bg-zinc-950 text-white p-5 rounded-2xl shadow-xl flex items-center gap-8 border-b-4 border-zinc-800">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Momentum</p>
            <p className="text-4xl font-black tracking-tighter leading-none">{data.xp} XP</p>
          </div>
          <div className="h-10 w-px bg-zinc-800" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Rank</p>
            <p className="text-xl font-black text-primary leading-none uppercase italic">Operative</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {activeBriefing && (
          <Card className="md:col-span-2 border-2 border-border bg-card shadow-sm overflow-hidden transition-all">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row min-h-[200px]">
                <div className="p-8 flex-1 space-y-4">
                  <div className="flex items-center gap-2 font-black uppercase tracking-widest text-xs text-muted-foreground">
                    <span className="text-primary">{activeBriefing.icon}</span>
                    {activeBriefing.title}
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-3xl font-black italic tracking-tight leading-tight text-foreground">"{activeBriefing.content}"</h2>
                    {activeBriefing.type === 'morning' && data.dailyLog?.starting_nudge && (
                      <div className="p-4 bg-muted border border-border rounded-xl flex items-center gap-4">
                        <Zap className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <span className="text-[10px] font-black uppercase text-muted-foreground block mb-0.5 tracking-widest">Starting Nudge</span>
                          <p className="font-bold text-foreground leading-tight">{data.dailyLog.starting_nudge}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {data.dailyLog?.goals_for_tomorrow?.length > 0 && activeBriefing.type === 'night' && (
                  <div className="bg-muted p-8 md:w-80 border-l border-border flex flex-col justify-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-5 flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 text-primary" /> Next Objectives
                    </h3>
                    <ul className="space-y-4">
                      {data.dailyLog.goals_for_tomorrow.map((goal: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm font-bold items-start">
                          <span className="bg-foreground text-background h-5 w-5 rounded flex items-center justify-center shrink-0 text-[10px] font-black">{i + 1}</span> 
                          <span className="text-foreground italic leading-snug">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Card className="border-2 border-zinc-900 bg-zinc-900 dark:bg-zinc-950 shadow-xl overflow-hidden relative text-white">
            <div className="absolute top-0 right-0 p-3 opacity-5">
              {timeLeft ? <Hourglass className="h-16 w-16 text-primary animate-pulse" /> : <Clock className="h-16 w-16 text-white" />}
            </div>
            <CardHeader className="pb-1 relative z-10 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                {timeLeft ? <Hourglass className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3" />}
                {timeLeft ? "Mission Timer" : "Deployment Clock"}
              </CardTitle>
              {!timeLeft && !isTimerInputOpen && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-500 hover:text-primary hover:bg-zinc-800 transition-all" onClick={() => setIsTimerInputOpen(true)}>
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="relative z-10 pt-2">
              {isTimerInputOpen ? (
                <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1 flex items-center bg-zinc-800 rounded-lg px-2 border border-zinc-700 focus-within:border-primary transition-all">
                    <input 
                      type="number"
                      autoFocus
                      className="w-full bg-transparent py-2 text-2xl font-black font-mono text-primary outline-none"
                      value={customTimerMinutes}
                      onChange={e => setCustomTimerMinutes(e.target.value)}
                    />
                    <span className="text-[8px] font-black text-zinc-500 uppercase ml-1">MIN</span>
                  </div>
                  <Button size="sm" className="bg-primary text-black font-black text-[10px] h-10 px-4" onClick={() => updateTimer(parseInt(customTimerMinutes))}>START</Button>
                  <Button variant="ghost" size="sm" className="text-zinc-500 h-10 w-10" onClick={() => setIsTimerInputOpen(false)}><X className="h-4 w-4" /></Button>
                </div>
              ) : timeLeft ? (
                <div className="flex items-center justify-between group h-12">
                  <div className="text-5xl font-black tracking-tighter text-primary italic leading-none font-mono">
                    {timeLeft}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-zinc-500 hover:text-rose-500 hover:bg-zinc-800" onClick={() => updateTimer(null)}>
                      <Square className="h-5 w-5 fill-current" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-black tracking-tighter text-zinc-700 uppercase italic leading-tight h-12 flex items-center">
                  Standby
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {data?.projects?.map((project: any) => (
              <div 
                key={project.id} 
                onClick={() => setSelectedProjectId(selectedProjectId === project.id ? null : project.id)}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer group hover:shadow-md ${
                  selectedProjectId === project.id 
                    ? 'border-primary bg-primary/5 shadow-inner' 
                    : 'border-border bg-card hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${selectedProjectId === project.id ? 'bg-primary text-zinc-900' : 'bg-muted text-muted-foreground'}`}>
                    {project.name}
                  </span>
                  <Badge variant="outline" className={`text-[10px] font-black border-2 ${selectedProjectId === project.id ? 'border-primary/30 text-foreground' : 'border-border text-muted-foreground'}`}>
                    {project.active_count} ACT
                  </Badge>
                </div>
                <div className={`text-sm font-bold tracking-tight transition-colors ${selectedProjectId === project.id ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  {project.description || "Operational Sector"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black uppercase tracking-tight italic text-foreground">Active Quests</h2>
            {selectedProjectId && (
              <Badge variant="secondary" className="gap-2 px-3 py-1 font-black bg-zinc-900 text-primary border-0">
                FILTER: {data.projects.find((p: any) => p.id === selectedProjectId)?.name}
                <X className="h-3.5 w-3.5 cursor-pointer hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedProjectId(null); }} />
              </Badge>
            )}
          </div>
          <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="font-black uppercase tracking-widest text-[10px] bg-zinc-900 dark:bg-zinc-950 text-white hover:bg-zinc-800 h-10 px-6">
            <Plus className="h-4 w-4 mr-2 text-primary" /> New Quest
          </Button>
        </div>

        <Card className="border-2 border-border shadow-md rounded-2xl overflow-hidden bg-card">
          <CardContent className="p-0">
            {isAdding && (
              <form onSubmit={handleCreateTask} className="p-8 border-b-2 border-dashed border-border bg-muted flex gap-6 items-end animate-in fade-in slide-in-from-top-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Objective</label>
                  <input 
                    autoFocus
                    className="w-full bg-card border-2 border-border rounded-xl px-4 py-3 font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    placeholder="Describe the mission..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div className="w-56 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sector</label>
                  <select 
                    className="w-full bg-card border-2 border-border rounded-xl px-4 py-3 font-bold text-foreground focus:border-primary outline-none"
                    value={selectedProjectId || ''}
                    onChange={e => setSelectedProjectId(Number(e.target.value))}
                  >
                    {data.projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 mb-0.5">
                  <Button type="submit" className="bg-primary text-zinc-900 font-black uppercase tracking-widest text-[10px] px-6 h-12">Deploy</Button>
                  <Button type="button" variant="ghost" className="h-12 w-12 rounded-xl border-2 border-transparent hover:border-border text-muted-foreground" onClick={() => setIsAdding(false)}><X className="h-5 w-5" /></Button>
                </div>
              </form>
            )}

            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Objective</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Priority</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Protocol</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuests.length > 0 ? filteredQuests.map((quest: any) => (
                  <TableRow key={quest.id} className="group hover:bg-muted/30 transition-colors border-b border-border last:border-0">
                    <TableCell className="py-6 px-6">
                      <div className="space-y-1.5">
                        <p className="font-black text-xl tracking-tighter text-foreground leading-none group-hover:text-primary transition-colors uppercase italic">{quest.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            // {quest.project_name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-black italic uppercase text-[10px] px-3 border-2 ${quest.priority === 'High' ? 'border-zinc-900 bg-zinc-900 dark:bg-zinc-800 text-primary' : 'border-border text-muted-foreground'}`}>
                        {quest.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5 font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        <div className={`h-2.5 w-2.5 rounded-full ${quest.status === 'Working' ? 'bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse' : 'bg-muted-foreground/30'}`} />
                        {quest.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        {quest.status === 'Todo' && (
                          <Button variant="outline" size="sm" className="h-9 bg-card hover:bg-foreground hover:text-background text-foreground border-2 border-foreground font-black text-[10px] tracking-widest px-4 transition-all" onClick={() => handleStatusUpdate(quest.id, 'Working')}>
                            <Play className="h-3 w-3 mr-1.5 fill-current" /> START
                          </Button>
                        )}
                        {quest.status === 'Working' && (
                          <>
                            <Button variant="outline" size="sm" className="h-9 bg-primary hover:bg-foreground hover:text-background text-zinc-900 border-2 border-primary font-black text-[10px] tracking-widest px-4 transition-all" onClick={() => handleStatusUpdate(quest.id, 'Done')}>
                              <CheckCircle2 className="h-3 w-3 mr-1.5" /> FINISH
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-muted text-muted-foreground" title="Pause" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Button variant="ghost" size="sm" className="text-muted/30 hover:text-rose-500 transition-all rounded-lg" onClick={() => handleDeleteTask(quest.id)}>
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-24 text-center text-muted-foreground font-black uppercase tracking-[0.2em] italic opacity-30">
                      Sector Clear // No Active Quests
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {data.history && data.history.length > 0 && (
        <Card className="border-2 border-border opacity-40 shadow-sm bg-card hover:opacity-100 transition-all overflow-hidden rounded-2xl group">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted py-4 px-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4" />
              Archives
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 bg-card">
            <Table>
              <TableBody>
                {data.history.map((quest: any) => (
                  <TableRow key={quest.id} className="hover:bg-muted border-border group/row last:border-0">
                    <TableCell className="py-4 px-6 line-through text-muted-foreground italic font-bold text-sm tracking-tight opacity-50">{quest.title}</TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-black text-[9px] tracking-widest h-8" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                          <RotateCcw className="h-3 w-3 mr-1.5" /> RESTORE
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-rose-500 h-8" onClick={() => handleDeleteTask(quest.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
