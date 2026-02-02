import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardData, updateTaskStatus, createTask, deleteTask, api } from '../data/dashboard-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newPriority, setNewPriority] = useState('Med')
  const [newProjectId, setNewProjectId] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  const [goalIndex, setGoalIndex] = useState(0)

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8000')
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('update', async () => {
        await router.invalidate()
    })
    return () => { socket.disconnect() }
  }, [router])

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
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 400)) // Mechanical delay
    try {
      await createTask({
        title: newTaskTitle,
        project_id: newProjectId || selectedProjectId || data.projects[0]?.id,
        status: 'Todo',
        priority: newPriority
      })
      setNewTaskTitle('')
      setNewPriority('Med')
      setIsAdding(false)
    } catch (error) { console.error(error) }
    setIsSubmitting(false)
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
  
  // Progress is specifically for the Targeted Objectives carousel
  const carouselCompleted = secondaryGoals.filter(g => isGoalCompleted(g)).length;
  const allCarouselDone = carouselCompleted >= secondaryGoals.length && secondaryGoals.length > 0;

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col overflow-hidden text-foreground">
      {/* TOP ROW: Information HUD */}
      <div className="bg-zinc-900 dark:bg-zinc-950 border-b border-zinc-800 shadow-2xl relative">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 min-h-[140px]">
          
          {/* Briefing Section (Large) */}
          <div className="md:col-span-3 p-8 border-r border-zinc-800 flex flex-col justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-900/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Sparkles size={120} />
            </div>
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
               <div className="flex flex-col items-center justify-center text-center space-y-3 opacity-40 py-2">
                  <div className="h-8 w-8 rounded-full border border-dashed border-zinc-500 flex items-center justify-center">
                    <Target size={14} className="text-zinc-500" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 block">No Targets</span>
                    <span className="text-[8px] font-bold uppercase tracking-wide text-zinc-600 block">System Standing By</span>
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden bg-background">
        {/* Project Navigation Sidebar */}
        <div className="hidden md:flex w-64 border-r border-border bg-card flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
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
          <div className="p-6 border-b border-border bg-background/50 backdrop-blur-sm flex items-center justify-between shrink-0 sticky top-0 z-30">
            <div className="flex-1 flex items-center gap-4 md:gap-8 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-8 overflow-hidden">
                <h2 className="text-xl font-black uppercase tracking-tight italic text-foreground truncate">
                  {selectedProjectId ? data.projects.find((p:any)=>p.id === selectedProjectId)?.name : "Active Operations"}
                </h2>
                
                {/* Mobile Project Selector */}
                <div className="md:hidden relative">
                  <select 
                    value={selectedProjectId || ""} 
                    onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                    className="appearance-none bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest py-1.5 pl-3 pr-8 rounded-lg w-full max-w-[200px]"
                  >
                    <option value="">Master Feed</option>
                    {data.projects.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 rotate-90 pointer-events-none" />
                </div>
              </div>
              
              {/* Primary Objective Banner inside Work Zone */}
              {primaryObjective && (
                <div className="hidden md:flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full animate-in fade-in slide-in-from-left-2">
                   <Target size={14} className="text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary italic leading-none">{primaryObjective}</span>
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => {
                setNewProjectId(selectedProjectId || data.projects[0]?.id || null)
                setIsAdding(true)
              }} 
              disabled={isAdding} 
              className="group relative overflow-hidden font-black uppercase tracking-widest text-[10px] h-10 px-6 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-primary dark:text-black rounded-xl shadow-lg transition-all active:scale-95 border border-zinc-800 dark:border-primary/50 hover:shadow-primary/20 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-10 group-hover:translate-y-0 transition-transform duration-300" />
              <div className="flex items-center gap-2 relative z-10">
                <Plus className="h-4 w-4 text-primary dark:text-black transition-transform group-hover:rotate-90 duration-300" strokeWidth={3} /> 
                <span>New Objective</span>
              </div>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
            {/* New Objective Form - Tactical Flat Layout */}
            {isAdding && (
              <form onSubmit={handleCreateTask} className="pb-8 border-b border-dashed border-zinc-800 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300 text-foreground group/form">
                
                {/* Top Row: Input and Action Buttons */}
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
                  <div className="flex-1 w-full space-y-2 relative">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <Target size={12} /> Operational Objective
                    </label>
                    <input 
                      autoFocus 
                      className="w-full bg-transparent border-b-2 border-zinc-700 focus:border-primary text-3xl font-black uppercase tracking-tighter py-2 outline-none transition-all placeholder:text-zinc-800 placeholder:opacity-50" 
                      placeholder="ENTER MISSION PARAMETERS..." 
                      value={newTaskTitle} 
                      onChange={e => setNewTaskTitle(e.target.value)} 
                    />
                  </div>

                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={`flex-1 md:flex-none h-14 min-w-[140px] font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl transition-all active:scale-95 ${isSubmitting ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-primary text-black hover:shadow-primary/20 hover:shadow-2xl'}`}
                    >
                      {isSubmitting ? (
                        <span className="animate-pulse">Deploying...</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Initialize</span> <ChevronRight size={12} strokeWidth={4} />
                        </div>
                      )}
                    </Button>
                    <Button type="button" variant="ghost" className="h-14 w-14 rounded-xl text-zinc-600 hover:bg-zinc-900 hover:text-white border border-transparent transition-all" onClick={() => setIsAdding(false)}>
                      <X size={20} />
                    </Button>
                  </div>
                </div>

                {/* Bottom Row: Controls */}
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  {/* Priority Toggle */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase tracking-wider">Threat Level</span>
                    <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                      {['Low', 'Med', 'High'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewPriority(p)}
                          className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${
                            newPriority === p 
                              ? p === 'High' ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                              : p === 'Med' ? 'bg-zinc-700 text-white' 
                              : 'border border-zinc-600 text-zinc-400 bg-transparent'
                              : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Project Selector */}
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase tracking-wider">Assigned Sector</span>
                    <Select
                      value={newProjectId}
                      onChange={(val) => setNewProjectId(Number(val))}
                      options={data.projects.map((p: any) => ({ value: p.id, label: p.name }))}
                      placeholder="Select Sector..."
                    />
                  </div>
                  
                  <div className="hidden md:block ml-auto opacity-30">
                     <span className="text-[9px] font-mono text-zinc-500">ID: {Math.floor(Math.random() * 9999)}</span>
                  </div>
                </div>
              </form>
            )}

            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-zinc-800/50">
                    <TableHead className="py-4 pl-0 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Mission Parameters</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 w-32 text-center">Threat</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 text-center w-32">Status</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 text-center w-40">Command</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuests.length > 0 ? filteredQuests.map((quest: any) => (
                    <TableRow key={quest.id} className="group hover:bg-zinc-900/30 transition-all border-b border-zinc-800/50 last:border-0 h-20">
                      <TableCell className="pl-0 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-1.5 w-1.5 rounded-full ${
                            quest.priority === 'High' ? 'bg-primary shadow-[0_0_8px_var(--primary)]' 
                            : quest.priority === 'Med' ? 'bg-zinc-500' 
                            : 'border border-zinc-600 bg-transparent'
                          }`} />
                          <p className="font-bold text-lg tracking-tight text-foreground group-hover:text-primary transition-colors">{quest.title}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded border ${
                          quest.priority === 'High' 
                            ? 'border-primary bg-primary text-black' 
                            : quest.priority === 'Med'
                            ? 'border-zinc-700 bg-zinc-800 text-zinc-300'
                            : 'border-zinc-800 text-zinc-600 bg-transparent'
                        }`}>
                          {quest.priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 font-bold text-[9px] uppercase tracking-widest text-zinc-500">
                          {quest.status === 'Working' ? (
                            <span className="text-primary animate-pulse">In Progress</span>
                          ) : (
                            <span>Pending</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center scale-95 group-hover:scale-100 transition-all opacity-60 group-hover:opacity-100">
                          {quest.status === 'Todo' && (
                            <Button variant="outline" size="sm" className="h-9 bg-transparent hover:bg-primary hover:text-black border border-zinc-700 hover:border-primary font-black text-[9px] tracking-[0.1em] px-4 rounded-lg transition-all" onClick={() => handleStatusUpdate(quest.id, 'Working')}>
                              ENGAGE
                            </Button>
                          )}
                          {quest.status === 'Working' && (
                            <div className="flex items-center gap-2">
                              <Button variant="default" size="sm" className="h-9 bg-primary text-black hover:bg-white border border-primary font-black text-[9px] tracking-[0.1em] px-4 rounded-lg transition-all shadow-[0_0_15px_rgba(255,190,0,0.3)]" onClick={() => handleStatusUpdate(quest.id, 'Done')}>
                                COMPLETE
                              </Button>
                              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                                <Pause size={14} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-0">
                        <Button variant="ghost" size="sm" className="text-zinc-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(quest.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-24">
                        <div className="flex flex-col items-center justify-center gap-4 text-zinc-700 opacity-50">
                          <div className="h-12 w-12 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
                            <CheckCircle2 size={20} />
                          </div>
                          <div className="text-center">
                            <p className="font-black uppercase tracking-[0.2em] text-sm">Sector Clear</p>
                            <p className="text-[9px] font-mono mt-1">NO ACTIVE HOSTILES</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

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
