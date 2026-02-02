import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardData, updateTaskStatus, createTask, deleteTask } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle2, RotateCcw, Pause, History, Plus, Trash2, X, Wifi, WifiOff, Sparkles, Moon, Zap, LogOut, Clock, Target, AlertCircle } from 'lucide-react'
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

  // Filter quests based on project selection
  const filteredQuests = selectedProjectId 
    ? data.quests.filter((q: any) => q.project_id === selectedProjectId)
    : data.quests;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto pb-20">
      <header className="flex justify-between items-center border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-zinc-900 dark:text-zinc-50">Vector Command</h1>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? 'Sync Active' : 'Offline'}
            </div>
          </div>
          <p className="text-muted-foreground font-medium tracking-tight">Doni's Strategic Operations Dashboard</p>
        </div>
        <div className="bg-zinc-900 text-zinc-50 p-4 rounded-xl shadow-2xl flex items-center gap-6 border-b-4 border-primary">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Daily Momentum</p>
            <p className="text-4xl font-black tracking-tighter">{data.xp} XP</p>
          </div>
          <div className="h-10 w-[2px] bg-zinc-700" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rank</p>
            <p className="text-xl font-bold text-primary">Operative</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {activeBriefing && (
          <Card className={`md:col-span-2 border-2 shadow-lg overflow-hidden transition-all ${
            activeBriefing.color === 'indigo' ? 'border-indigo-400 bg-indigo-50/10' : 
            activeBriefing.color === 'zinc' ? 'border-zinc-400 bg-zinc-50' :
            activeBriefing.color === 'blue' ? 'border-blue-400 bg-blue-50/10' :
            'border-amber-400 bg-amber-50/10'
          }`}>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row min-h-[200px]">
                <div className="p-8 flex-1 space-y-4">
                  <div className={`flex items-center gap-2 font-black uppercase tracking-widest text-xs ${
                    activeBriefing.color === 'indigo' ? 'text-indigo-600' : 
                    activeBriefing.color === 'zinc' ? 'text-zinc-600' :
                    activeBriefing.color === 'blue' ? 'text-blue-600' :
                    'text-amber-600'
                  }`}>
                    {activeBriefing.icon}
                    {activeBriefing.title}
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold italic tracking-tight leading-tight">"{activeBriefing.content}"</h2>
                    {activeBriefing.type === 'morning' && data.daily_logs?.starting_nudge && (
                      <div className="p-4 bg-white/50 rounded-lg border-2 border-dashed border-amber-200 flex items-center gap-4">
                        <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-600 block mb-0.5 tracking-widest">Starting Nudge</span>
                          <p className="font-bold text-zinc-800">{data.dailyLog.starting_nudge}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {data.dailyLog?.goals_for_tomorrow?.length > 0 && activeBriefing.type === 'night' && (
                  <div className="bg-indigo-100/20 p-8 md:w-80 border-l-2 border-indigo-100 flex flex-col justify-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-2">
                      <Target className="h-3 w-3" /> Targeted Objectives
                    </h3>
                    <ul className="space-y-4">
                      {data.dailyLog.goals_for_tomorrow.map((goal: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm font-bold items-start">
                          <span className="bg-indigo-200 text-indigo-700 h-5 w-5 rounded flex items-center justify-center shrink-0 text-[10px]">{i + 1}</span> 
                          <span className="text-zinc-700 italic">{goal}</span>
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
          <Card className="border-2 border-zinc-900 bg-zinc-900 text-white shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Today's Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-primary uppercase italic">
                {data.dailyLog?.big_win || "Define Big Win"}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {data?.projects?.map((project: any) => (
              <div 
                key={project.id} 
                onClick={() => setSelectedProjectId(selectedProjectId === project.id ? null : project.id)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer group hover:shadow-md ${
                  selectedProjectId === project.id 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-zinc-100 bg-zinc-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${selectedProjectId === project.id ? 'text-primary' : 'text-zinc-500'}`}>
                    {project.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold group-hover:bg-white transition-colors">
                    {project.active_count} ACTIVE
                  </Badge>
                </div>
                <div className="text-sm font-medium text-zinc-400 group-hover:text-zinc-600 transition-colors">
                  {project.description || "Project Operations"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black uppercase tracking-tight italic">Active Quests</h2>
            {selectedProjectId && (
              <Badge variant="secondary" className="gap-1 animate-in fade-in slide-in-from-left-2">
                Filtering by {data.projects.find((p: any) => p.id === selectedProjectId)?.name}
                <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedProjectId(null); }} />
              </Badge>
            )}
          </div>
          <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="font-bold uppercase tracking-widest text-xs">
            <Plus className="h-4 w-4 mr-2" /> New Quest
          </Button>
        </div>

        <Card className="border-2 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {isAdding && (
              <form onSubmit={handleCreateTask} className="p-6 border-b-2 border-dashed bg-zinc-50 flex gap-4 items-end animate-in fade-in slide-in-from-top-4">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-500">Quest Objective</label>
                  <input 
                    autoFocus
                    className="w-full bg-white border-2 rounded-lg px-4 py-3 font-bold focus:border-primary outline-none shadow-sm transition-all"
                    placeholder="Capture a new mission..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div className="w-48 space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-500">Project</label>
                  <select 
                    className="w-full bg-white border-2 rounded-lg px-4 py-3 font-bold outline-none shadow-sm"
                    value={selectedProjectId || ''}
                    onChange={e => setSelectedProjectId(Number(e.target.value))}
                  >
                    {data.projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 mb-1">
                  <Button type="submit">Deploy</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}><X className="h-4 w-4" /></Button>
                </div>
              </form>
            )}

            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow>
                  <TableHead className="w-[500px] text-[10px] font-black uppercase tracking-widest">Objective</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Priority</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Actions</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuests.length > 0 ? filteredQuests.map((quest: any) => (
                  <TableRow key={quest.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <p className="font-black text-lg tracking-tight group-hover:text-primary transition-colors">{quest.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {quest.project_name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={quest.priority === 'High' ? 'destructive' : 'secondary'} className="font-black italic uppercase text-[10px]">
                        {quest.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                        <span className={`h-2.5 w-2.5 rounded-full ${quest.status === 'Working' ? 'bg-blue-500 animate-pulse ring-4 ring-blue-100' : 'bg-slate-300'}`} />
                        {quest.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {quest.status === 'Todo' && (
                          <Button variant="outline" size="sm" className="h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 font-bold" onClick={() => handleStatusUpdate(quest.id, 'Working')}>
                            <Play className="h-3 w-3 mr-1" /> START
                          </Button>
                        )}
                        {quest.status === 'Working' && (
                          <>
                            <Button variant="outline" size="sm" className="h-8 bg-green-50 hover:bg-green-100 text-green-700 border-green-200 font-bold" onClick={() => handleStatusUpdate(quest.id, 'Done')}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> FINISH
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Pause" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleDeleteTask(quest.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center text-zinc-400 font-medium italic border-b-0">
                      No active quests found in this sector.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* History Section */}
      {data.history && data.history.length > 0 && (
        <Card className="border-2 opacity-50 shadow-md bg-zinc-50/50 hover:opacity-100 transition-opacity overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-zinc-100/30 py-4">
            <div>
              <CardTitle className="text-xs flex items-center gap-2 font-black uppercase tracking-widest text-zinc-500">
                <History className="h-4 w-4" />
                Mission History
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {data.history.map((quest: any) => (
                  <TableRow key={quest.id} className="hover:bg-transparent border-zinc-100 group">
                    <TableCell className="line-through text-zinc-400 italic font-medium">{quest.title}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-primary h-8" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                          <RotateCcw className="h-3 w-3 mr-1" /> UNDO
                        </Button>
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-red-500 h-8" onClick={() => handleDeleteTask(quest.id)}>
                          <Trash2 className="h-3 w-3" />
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
