import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardData, updateTaskStatus, createTask, deleteTask, api } from '../data/dashboard-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle2, RotateCcw, Pause, History, Plus, Trash2, X, Wifi, Sparkles, Moon, Zap, LogOut, Clock, Target, Hourglass, Square, Minus, LayoutGrid, Terminal, Check, ChevronRight, ChevronLeft, Trophy } from 'lucide-react'
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
  const [timerSetupValue, setTimerSetupValue] = useState(25)
  const [localTimerEnd, setLocalTimerEnd] = useState<string | null>(null)
  
  const [goalIndex, setGoalIndex] = useState(0)

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8000')
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('update', async () => {
        await router.invalidate()
        setLocalTimerEnd(null)
    })
    return () => { socket.disconnect() }
  }, [router])

  const handleTimerAction = async (minutes: number | null) => {
    const newEnd = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null
    setLocalTimerEnd(newEnd)
    try {
      await api.post('/daily-log/update', {
        id: data.dailyLog.id,
        date: data.dailyLog.date,
        timer_end: newEnd
      })
    } catch (error) {
      setLocalTimerEnd(null) 
      router.invalidate()
    }
  }

  // OBJECTIVE LOGIC
  // Big Win is always the primary focus for the current day.
  // Targeted Objectives (goals_for_tomorrow) are the "slides" in the carousel.
  const primaryObjective = data.dailyLog?.big_win;
  const secondaryGoals = data.dailyLog?.goals_for_tomorrow || [];
  
  const completedGoals = data.dailyLog?.reflections?.split('|').filter(Boolean) || [];
  const isGoalCompleted = (goal: string) => completedGoals.includes(goal);

  const markGoalSuccess = async (goal: string) => {
    if (!data.dailyLog) return;
    try {
      const newCompleted = [...completedGoals, goal].join('|');
      await api.post('/daily-log/update', {
        id: data.dailyLog.id,
        date: data.dailyLog.date,
        reflections: newCompleted
      })
    } catch (e) { console.error(e) }
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
    if (data.dailyLog.nightly_reflection) return { type: 'night', icon: <Moon className="h-4 w-4" />, title: 'Nightly Reflection', content: data.dailyLog.nightly_reflection, accent: 'text-indigo-400' };
    if (data.dailyLog.shutdown_briefing) return { type: 'shutdown', icon: <LogOut className="h-4 w-4" />, title: 'Shutdown Ritual', content: data.dailyLog.shutdown_briefing, accent: 'text-zinc-400' };
    if (data.dailyLog.midday_briefing) return { type: 'midday', icon: <Zap className="h-4 w-4" />, title: 'Mid-Day Pivot', content: data.dailyLog.midday_briefing, accent: 'text-blue-400' };
    return { type: 'morning', icon: <Sparkles className="h-4 w-4" />, title: 'Strategic Briefing', content: data.dailyLog.morning_briefing || "Awaiting intelligence briefing...", accent: 'text-amber-400' };
  }

  const activeBriefing = getActiveBriefing();
  const filteredQuests = selectedProjectId 
    ? data.quests.filter((q: any) => q.project_id === selectedProjectId)
    : data.quests;

  const isTimerActive = !!(localTimerEnd || data.dailyLog?.timer_end);
  
  // Progress is specifically for the Targeted Objectives carousel
  const carouselCompleted = secondaryGoals.filter(g => isGoalCompleted(g)).length;
  const allCarouselDone = carouselCompleted >= secondaryGoals.length && secondaryGoals.length > 0;

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col overflow-hidden text-foreground">
      {/* TOP ROW: Information HUD */}
      <div className="bg-zinc-900 dark:bg-zinc-950 border-b border-zinc-800 shadow-2xl relative">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 min-h-[140px]">
          
          {/* Briefing Section (Large) */}
          <div className="md:col-span-3 p-8 border-r border-zinc-800 flex flex-col justify-center">
            {activeBriefing ? (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`${activeBriefing.accent} bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-700/50`}>{activeBriefing.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
                    Directive // {activeBriefing.title}
                  </span>
                </div>
                <div className="relative">
                  <h2 className="text-lg font-bold italic tracking-tight leading-relaxed text-zinc-100 max-w-4xl border-l-2 border-primary/30 pl-4">
                    {activeBriefing.content}
                  </h2>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-zinc-600 animate-pulse uppercase font-black tracking-widest text-xs">
                 Connecting to Command...
              </div>
            )}
          </div>

          {/* Targeted Objectives Carousel (Tomorrow's Targets collected tonight, shown tomorrow) */}
          <div className="p-8 flex flex-col justify-center bg-black/20 group/win relative overflow-hidden border-l border-zinc-800/50">
            {allCarouselDone ? (
              <div className="flex flex-col items-center justify-center text-center space-y-2 animate-in zoom-in-95 duration-500">
                 <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(255,190,0,0.3)]">
                   <Trophy size={20} className="text-primary" />
                 </div>
                 <h3 className="text-primary font-black uppercase italic tracking-tighter text-base">Campaign Complete</h3>
                 <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">All targets secured.</p>
              </div>
            ) : secondaryGoals.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
                        <Target size={10} className="text-primary" /> 
                        Target {goalIndex + 1}/{secondaryGoals.length}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={() => setGoalIndex(prev => Math.max(0, prev - 1))} className="text-zinc-600 hover:text-white transition-colors disabled:opacity-10" disabled={goalIndex === 0}><ChevronLeft size={14}/></button>
                        <button onClick={() => setGoalIndex(prev => Math.min(secondaryGoals.length - 1, prev + 1))} className="text-zinc-600 hover:text-white transition-colors disabled:opacity-10" disabled={goalIndex === secondaryGoals.length - 1}><ChevronRight size={14}/></button>
                    </div>
                </div>

                <div className="relative min-h-[40px] flex items-center pr-10 group/item">
                    <div className={`text-sm font-black italic uppercase leading-tight tracking-tight transition-all duration-300 ${isGoalCompleted(secondaryGoals[goalIndex]) ? 'text-zinc-600 line-through opacity-50' : 'text-primary'}`}>
                        {secondaryGoals[goalIndex]}
                    </div>
                    {!isGoalCompleted(secondaryGoals[goalIndex]) && (
                        <button 
                            onClick={() => markGoalSuccess(secondaryGoals[goalIndex])}
                            className="absolute right-0 h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary opacity-0 group-hover/item:opacity-100 transition-all hover:bg-primary hover:text-black shadow-lg"
                        >
                            <Check size={16} strokeWidth={3} />
                        </button>
                    )}
                </div>

                <div className="pt-2 border-t border-zinc-800">
                    <div className="flex gap-1.5">
                      {secondaryGoals.map((g: string, i: number) => (
                        <div 
                            key={i} 
                            className={`h-1 flex-1 rounded-full transition-all duration-700 ${isGoalCompleted(g) ? 'bg-primary shadow-[0_0_8px_var(--primary)]' : 'bg-zinc-800'}`} 
                        />
                      ))}
                    </div>
                </div>
              </div>
            ) : (
               <div className="text-center space-y-2 opacity-30">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500 block">No Secondary Targets</span>
                  <div className="h-px w-full bg-zinc-800" />
               </div>
            )}
          </div>
        </div>
      </div>

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
              className={`w-full text-left p-4 rounded-xl transition-all font-black uppercase italic tracking-tighter text-sm flex items-center justify-between ${!selectedProjectId ? 'bg-zinc-900 text-primary shadow-xl scale-[1.02] dark:bg-primary dark:text-black border border-zinc-800' : 'hover:bg-muted text-muted-foreground'}`}
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
                className={`w-full text-left p-4 rounded-xl transition-all font-black uppercase italic tracking-tighter text-sm flex items-center justify-between group ${selectedProjectId === project.id ? 'bg-zinc-900 text-primary shadow-xl scale-[1.02] dark:bg-primary dark:text-black border border-zinc-800' : 'hover:bg-muted text-muted-foreground'}`}
              >
                {project.name}
                <Badge variant="outline" className={`text-[10px] border-current opacity-50`}>
                  {project.active_count}
                </Badge>
              </button>
            ))}
          </div>

          {/* Timer Module in Sidebar */}
          {!isTimerActive && (
            <div className="p-4 mx-4 mb-4 bg-zinc-900 dark:bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Deploy Timer</span>
                <Clock size={12} className="text-zinc-500" />
              </div>
              <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-1.5 border border-zinc-700/50">
                <button onClick={() => setTimerSetupValue(v => Math.max(1, v - 5))} className="text-zinc-500 hover:text-primary transition-colors p-1"><Minus size={14} /></button>
                <span className="text-xl font-black font-mono text-white">{timerSetupValue}</span>
                <button onClick={() => setTimerSetupValue(v => v + 5)} className="text-zinc-500 hover:text-primary transition-colors p-1"><Plus size={14} /></button>
              </div>
              <Button 
                className="w-full bg-primary text-black font-black uppercase text-[10px] h-9 rounded-xl shadow-lg transition-all"
                onClick={() => handleTimerAction(timerSetupValue)}
              >
                Launch
              </Button>
            </div>
          )}
          
          {isTimerActive && (
            <div className="p-4 mx-4 mb-4 bg-primary rounded-2xl shadow-[0_0_20px_rgba(255,190,0,0.2)] flex items-center justify-between group animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <Hourglass size={16} className="text-black animate-pulse" />
                <span className="text-[10px] font-black uppercase text-black tracking-widest">Active</span>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-black hover:bg-black/10" onClick={() => handleTimerAction(null)}>
                <Square className="h-4 w-4 fill-current" />
              </Button>
            </div>
          )}

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
          {/* Work Zone Header */}
          <div className="p-6 border-b border-border bg-background/50 backdrop-blur-sm flex items-center justify-between shrink-0">
            <div className="flex-1 flex items-center gap-8">
              <h2 className="text-xl font-black uppercase tracking-tight italic text-foreground">
                {selectedProjectId ? data.projects.find((p:any)=>p.id === selectedProjectId)?.name : "Active Operations"}
              </h2>
              
              {/* Primary Objective Banner inside Work Zone */}
              {primaryObjective && (
                <div className="hidden md:flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full animate-in fade-in slide-in-from-left-2">
                   <Target size={14} className="text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary italic leading-none">{primaryObjective}</span>
                </div>
              )}
            </div>
            
            <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="font-black uppercase tracking-widest text-[10px] h-10 px-6 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-primary dark:text-black rounded-xl shadow-lg transition-all active:scale-95">
              <Plus className="h-4 w-4 mr-2 text-primary" /> New Objective
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
            <Card className="border-2 border-border shadow-xl rounded-3xl overflow-hidden bg-card">
              <CardContent className="p-0">
                {isAdding && (
                  <form onSubmit={handleCreateTask} className="p-10 border-b-2 border-dashed border-border bg-muted/30 flex gap-6 items-end animate-in fade-in slide-in-from-top-6 duration-500 text-foreground">
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
                        <TableCell colSpan={5} className="py-32 text-center text-muted-foreground font-black uppercase tracking-[0.2em] italic opacity-30">Sector Clear // No Active Quests</TableCell>
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
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 text-foreground">
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
