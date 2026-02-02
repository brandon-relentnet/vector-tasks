import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardData, updateTaskStatus, createTask, deleteTask } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle2, RotateCcw, Pause, History, Plus, Trash2, X, Wifi, WifiOff, Sparkles, Moon, Zap, LogOut, Clock, Target } from 'lucide-react'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

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

  // Real-time synchronization
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

  const getActiveBriefing = () => {
    if (!data.dailyLog) return null;
    if (data.dailyLog.nightly_reflection) return { type: 'night', icon: <Moon className="h-5 w-5" />, title: 'Nightly Reflection', content: data.dailyLog.nightly_reflection, color: 'indigo' };
    if (data.dailyLog.shutdown_briefing) return { type: 'shutdown', icon: <LogOut className="h-5 w-5" />, title: 'Shutdown Ritual', content: data.dailyLog.shutdown_briefing, color: 'zinc' };
    if (data.dailyLog.midday_briefing) return { type: 'midday', icon: <Zap className="h-5 w-5" />, title: 'Mid-Day Pivot', content: data.dailyLog.midday_briefing, color: 'blue' };
    return { type: 'morning', icon: <Sparkles className="h-5 w-5" />, title: 'Strategic Briefing', content: data.dailyLog.morning_briefing || "Awaiting intelligence briefing...", color: 'amber' };
  }

  const activeBriefing = getActiveBriefing();

  const filteredQuests = selectedProjectId 
    ? data.quests.filter((q: any) => q.project_id === selectedProjectId)
    : data.quests;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto pb-20 text-zinc-900">
      <header className="flex justify-between items-center border-b pb-6 border-zinc-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Vector Command</h1>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {isConnected ? 'Sync Active' : 'Offline'}
            </div>
          </div>
          <p className="text-zinc-500 font-medium tracking-tight">Tactical Operations Control Center</p>
        </div>
        <div className="bg-zinc-900 text-white p-5 rounded-2xl shadow-2xl flex items-center gap-8 border-b-4 border-primary">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Momentum</p>
            <p className="text-4xl font-black tracking-tighter leading-none">{data.xp} XP</p>
          </div>
          <div className="h-10 w-px bg-zinc-800" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Status</p>
            <p className="text-xl font-black text-primary leading-none uppercase italic">Operative</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {activeBriefing && (
          <Card className={`md:col-span-2 border-2 shadow-sm overflow-hidden transition-all ${
            activeBriefing.color === 'indigo' ? 'border-indigo-200 bg-indigo-50/30' : 
            activeBriefing.color === 'zinc' ? 'border-zinc-300 bg-zinc-50' :
            activeBriefing.color === 'blue' ? 'border-blue-200 bg-blue-50/30' :
            'border-amber-200 bg-amber-50/30'
          }`}>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row min-h-[200px]">
                <div className="p-8 flex-1 space-y-4">
                  <div className={`flex items-center gap-2 font-black uppercase tracking-widest text-xs ${
                    activeBriefing.color === 'indigo' ? 'text-indigo-700' : 
                    activeBriefing.color === 'zinc' ? 'text-zinc-700' :
                    activeBriefing.color === 'blue' ? 'text-blue-700' :
                    'text-amber-700'
                  }`}>
                    {activeBriefing.icon}
                    {activeBriefing.title}
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold italic tracking-tight leading-tight text-zinc-900">"{activeBriefing.content}"</h2>
                    {activeBriefing.type === 'morning' && data.dailyLog?.starting_nudge && (
                      <div className="p-4 bg-white border border-amber-200 rounded-xl shadow-sm flex items-center gap-4">
                        <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-600 block mb-0.5 tracking-widest">Starting Nudge</span>
                          <p className="font-bold text-zinc-800 leading-tight">{data.dailyLog.starting_nudge}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {data.dailyLog?.goals_for_tomorrow?.length > 0 && activeBriefing.type === 'night' && (
                  <div className="bg-indigo-100/40 p-8 md:w-80 border-l border-indigo-200 flex flex-col justify-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-5 flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" /> Next Objectives
                    </h3>
                    <ul className="space-y-4">
                      {data.dailyLog.goals_for_tomorrow.map((goal: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm font-bold items-start">
                          <span className="bg-indigo-600 text-white h-5 w-5 rounded flex items-center justify-center shrink-0 text-[10px] font-black">{i + 1}</span> 
                          <span className="text-indigo-900 italic leading-snug">{goal}</span>
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
          <Card className="border-2 border-zinc-900 bg-zinc-900 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Target className="h-16 w-16" />
            </div>
            <CardHeader className="pb-1 relative z-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Mission Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-black tracking-tighter text-primary uppercase italic leading-tight">
                {data.dailyLog?.big_win || "Define Big Win"}
              </div>
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
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${selectedProjectId === project.id ? 'text-primary-foreground bg-primary px-2 py-0.5 rounded' : 'text-zinc-400'}`}>
                    {project.name}
                  </span>
                  <Badge variant="outline" className={`text-[10px] font-black border-2 ${selectedProjectId === project.id ? 'border-primary/30 text-primary' : 'border-zinc-100 text-zinc-400'}`}>
                    {project.active_count} ACTIVE
                  </Badge>
                </div>
                <div className={`text-sm font-bold tracking-tight transition-colors ${selectedProjectId === project.id ? 'text-zinc-800' : 'text-zinc-400 group-hover:text-zinc-600'}`}>
                  {project.description || "Project Operations"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black uppercase tracking-tight italic text-zinc-900">Active Quests</h2>
            {selectedProjectId && (
              <Badge variant="secondary" className="gap-2 px-3 py-1 font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                Filter: {data.projects.find((p: any) => p.id === selectedProjectId)?.name}
                <X className="h-3.5 w-3.5 cursor-pointer hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedProjectId(null); }} />
              </Badge>
            )}
          </div>
          <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="font-black uppercase tracking-widest text-[10px] bg-zinc-900 hover:bg-zinc-800 h-10 px-6">
            <Plus className="h-4 w-4 mr-2 text-primary" /> New Quest
          </Button>
        </div>

        <Card className="border-2 border-zinc-200 shadow-md rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            {isAdding && (
              <form onSubmit={handleCreateTask} className="p-8 border-b-2 border-dashed border-zinc-100 bg-zinc-50 flex gap-6 items-end animate-in fade-in slide-in-from-top-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Quest Objective</label>
                  <input 
                    autoFocus
                    className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-zinc-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    placeholder="Describe the mission..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div className="w-56 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Project Sector</label>
                  <select 
                    className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-zinc-900 focus:border-primary outline-none"
                    value={selectedProjectId || ''}
                    onChange={e => setSelectedProjectId(Number(e.target.value))}
                  >
                    {data.projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 mb-0.5">
                  <Button type="submit" className="bg-primary text-black font-black uppercase tracking-widest text-[10px] px-6 h-12">Deploy</Button>
                  <Button type="button" variant="ghost" className="h-12 w-12 rounded-xl border-2 border-transparent hover:border-zinc-200" onClick={() => setIsAdding(false)}><X className="h-5 w-5" /></Button>
                </div>
              </form>
            )}

            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="border-b-2 border-zinc-100">
                  <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Objective</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Priority</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Protocol</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuests.length > 0 ? filteredQuests.map((quest: any) => (
                  <TableRow key={quest.id} className="group hover:bg-zinc-50/30 transition-colors border-b border-zinc-100 last:border-0">
                    <TableCell className="py-6 px-6">
                      <div className="space-y-1.5">
                        <p className="font-black text-xl tracking-tighter text-zinc-900 leading-none group-hover:text-primary transition-colors">{quest.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                            {quest.project_name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={quest.priority === 'High' ? 'destructive' : 'secondary'} className="font-black italic uppercase text-[10px] px-3">
                        {quest.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5 font-black text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                        <div className={`h-2.5 w-2.5 rounded-full ${quest.status === 'Working' ? 'bg-blue-500 animate-pulse ring-4 ring-blue-100' : 'bg-zinc-300'}`} />
                        {quest.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        {quest.status === 'Todo' && (
                          <Button variant="outline" size="sm" className="h-9 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border-2 border-blue-200 font-black text-[10px] tracking-widest px-4 transition-all" onClick={() => handleStatusUpdate(quest.id, 'Working')}>
                            <Play className="h-3 w-3 mr-1.5 fill-current" /> START
                          </Button>
                        )}
                        {quest.status === 'Working' && (
                          <>
                            <Button variant="outline" size="sm" className="h-9 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border-2 border-emerald-200 font-black text-[10px] tracking-widest px-4 transition-all" onClick={() => handleStatusUpdate(quest.id, 'Done')}>
                              <CheckCircle2 className="h-3 w-3 mr-1.5" /> COMPLETE
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-zinc-200" title="Pause" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Button variant="ghost" size="sm" className="text-zinc-200 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all rounded-lg" onClick={() => handleDeleteTask(quest.id)}>
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-24 text-center text-zinc-400 font-bold uppercase tracking-widest italic opacity-40">
                      Sector Clear. No Active Quests.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {data.history && data.history.length > 0 && (
        <Card className="border-2 border-zinc-100 opacity-40 shadow-sm bg-zinc-50/50 hover:opacity-100 transition-all overflow-hidden rounded-2xl group">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 bg-white py-4 px-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <History className="h-4 w-4" />
              Historical Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 bg-white/50">
            <Table>
              <TableBody>
                {data.history.map((quest: any) => (
                  <TableRow key={quest.id} className="hover:bg-zinc-50 border-zinc-100 group/row last:border-0">
                    <TableCell className="py-4 px-6 line-through text-zinc-400 italic font-bold text-sm tracking-tight">{quest.title}</TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-primary font-black text-[9px] tracking-widest h-8" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                          <RotateCcw className="h-3 w-3 mr-1.5" /> RESTORE
                        </Button>
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-rose-500 h-8" onClick={() => handleDeleteTask(quest.id)}>
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
