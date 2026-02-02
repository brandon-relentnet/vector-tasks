import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutGrid,
  LogOut,
  Moon,
  Pause,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Wifi,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import {
  api,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getDashboardData,
  updateTaskStatus,
} from '../data/dashboard-fns'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const data = await getDashboardData()
      return data
    } catch (error) {
      console.error('Loader error:', error)
      return { xp: 0, quests: [], history: [], projects: [], dailyLog: null }
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
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  )
  const [isConnected, setIsConnected] = useState(false)

  const [goalIndex, setGoalIndex] = useState(0)

  // Sector creation modal
  const [isCreatingSector, setIsCreatingSector] = useState(false)
  const [newSectorName, setNewSectorName] = useState('')
  const [newSectorParent, setNewSectorParent] = useState<number | null>(null)
  const [isSubmittingSector, setIsSubmittingSector] = useState(false)

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSectorName.trim()) return
    setIsSubmittingSector(true)
    try {
      await createProject({
        name: newSectorName,
        parent_id: newSectorParent,
      })
      setNewSectorName('')
      setNewSectorParent(null)
      setIsCreatingSector(false)
      await router.invalidate()
    } catch (error) {
      console.error(error)
    }
    setIsSubmittingSector(false)
  }

  const handleDeleteSector = async (projectId: number) => {
    if (!confirm('Delete this sector and all its sub-sectors?')) return
    try {
      await deleteProject(projectId)
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null)
      }
      await router.invalidate()
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8000')
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('update', async () => {
      await router.invalidate()
    })
    return () => {
      socket.disconnect()
    }
  }, [router])

  // Sort projects hierarchically (sub-sectors appear under their parents)
  const sortedProjects = (() => {
    const topLevel = data.projects
      .filter((p: any) => !p.parent_id)
      .sort((a, b) => a.name.localeCompare(b.name))

    const result: any[] = []

    for (const parent of topLevel) {
      result.push(parent)
      // Find and add sub-sectors immediately after their parent
      const subs = data.projects
        .filter((p: any) => p.parent_id === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name))
      result.push(...subs)
    }

    return result
  })()

  // OBJECTIVE LOGIC
  // Big Win is always the primary focus for the current day.
  // Targeted Objectives (goals_for_tomorrow) are the "slides" in the carousel.
  const primaryObjective = data.dailyLog?.big_win
  const secondaryGoals = data.dailyLog?.goals_for_tomorrow || []

  const completedGoals =
    data.dailyLog?.reflections?.split('|').filter(Boolean) || []
  const isGoalCompleted = (goal: string) => completedGoals.includes(goal)

  const markGoalSuccess = async (goal: string) => {
    if (!data.dailyLog) return
    try {
      const newCompleted = [...completedGoals, goal].join('|')
      await api.post('/daily-log/update', {
        id: data.dailyLog.id,
        date: data.dailyLog.date,
        reflections: newCompleted,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleStatusUpdate = async (taskId: number, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus)
      await router.invalidate() // Force refresh immediately
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 400)) // Mechanical delay
    try {
      await createTask({
        title: newTaskTitle,
        project_id: newProjectId || selectedProjectId || data.projects[0]?.id,
        status: 'Todo',
        priority: newPriority,
      })
      setNewTaskTitle('')
      setNewPriority('Med')
      setIsAdding(false)
      await router.invalidate() // Force refresh immediately
    } catch (error) {
      console.error(error)
    }
    setIsSubmitting(false)
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Delete quest?')) return
    try {
      await deleteTask(taskId)
      await router.invalidate() // Force refresh immediately
    } catch (error) {
      console.error(error)
    }
  }

  const getActiveBriefing = () => {
    if (!data.dailyLog) return null

    // Check new briefings table first
    const briefings = data.dailyLog.briefings || []
    if (briefings.length > 0) {
      // Get the most recent briefing
      const latestBriefing = briefings[0] // Already ordered by created_at desc
      const slotConfig: Record<string, { icon: any; title: string; accent: string }> = {
        'Morning': { icon: Sparkles, title: 'Strategic Briefing', accent: 'text-amber-400' },
        'Midday': { icon: Zap, title: 'Mid-Day Pivot', accent: 'text-blue-400' },
        'Shutdown': { icon: LogOut, title: 'Shutdown Ritual', accent: 'text-zinc-400' },
        'Night': { icon: Moon, title: 'Nightly Reflection', accent: 'text-indigo-400' },
      }
      const config = slotConfig[latestBriefing.slot] || slotConfig['Morning']
      return {
        type: latestBriefing.slot.toLowerCase(),
        icon: <config.icon className="w-4 h-4" />,
        title: config.title,
        content: latestBriefing.content,
        accent: config.accent,
      }
    }

    // Fallback to deprecated columns
    if (data.dailyLog.nightly_reflection)
      return {
        type: 'night',
        icon: <Moon className="w-4 h-4" />,
        title: 'Nightly Reflection',
        content: data.dailyLog.nightly_reflection,
        accent: 'text-indigo-400',
      }
    if (data.dailyLog.shutdown_briefing)
      return {
        type: 'shutdown',
        icon: <LogOut className="w-4 h-4" />,
        title: 'Shutdown Ritual',
        content: data.dailyLog.shutdown_briefing,
        accent: 'text-zinc-400',
      }
    if (data.dailyLog.midday_briefing)
      return {
        type: 'midday',
        icon: <Zap className="w-4 h-4" />,
        title: 'Mid-Day Pivot',
        content: data.dailyLog.midday_briefing,
        accent: 'text-blue-400',
      }
    return {
      type: 'morning',
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Strategic Briefing',
      content:
        data.dailyLog.morning_briefing || 'Awaiting intelligence briefing...',
      accent: 'text-amber-400',
    }
  }

  const activeBriefing = getActiveBriefing()
  const filteredQuests = selectedProjectId
    ? data.quests.filter((q: any) => q.project_id === selectedProjectId)
    : data.quests

  // Progress is specifically for the Targeted Objectives carousel
  const carouselCompleted = secondaryGoals.filter((g: string) =>
    isGoalCompleted(g),
  ).length
  const allCarouselDone =
    carouselCompleted >= secondaryGoals.length && secondaryGoals.length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden text-foreground">
      {/* TOP ROW: Information HUD */}
      <div className="relative bg-zinc-900 dark:bg-zinc-950 shadow-2xl border-zinc-800 border-b">
        <div className="grid grid-cols-1 md:grid-cols-4 mx-auto max-w-[1600px] min-h-[140px]">
          {/* Briefing Section (Large) */}
          <div className="relative flex flex-col justify-center md:col-span-3 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-900/50 p-8 border-zinc-800 border-r overflow-hidden">
            <div className="top-0 right-0 absolute opacity-5 p-4">
              <Sparkles size={120} />
            </div>
            {activeBriefing ? (
              <div className="space-y-3 slide-in-from-left-4 animate-in duration-500 fade-in">
                <div className="flex items-center gap-3">
                  <span
                    className={`${activeBriefing.accent} bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-700/50`}
                  >
                    {activeBriefing.icon}
                  </span>
                  <span className="font-black text-[10px] text-zinc-500 uppercase tracking-[0.4em]">
                    Directive // {activeBriefing.title}
                  </span>
                </div>
                <div className="relative">
                  <h2 className="pl-4 border-primary/30 border-l-2 max-w-4xl font-bold text-zinc-100 text-lg italic leading-relaxed tracking-tight">
                    {activeBriefing.content}
                  </h2>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 font-black text-zinc-600 text-xs uppercase tracking-widest animate-pulse">
                Connecting to Command...
              </div>
            )}
          </div>

          {/* Targeted Objectives Carousel (Tomorrow's Targets collected tonight, shown tomorrow) */}
          <div className="group/win relative flex flex-col justify-center bg-black/20 p-8 border-zinc-800/50 border-l overflow-hidden">
            {allCarouselDone ? (
              <div className="flex flex-col justify-center items-center space-y-2 text-center animate-in duration-500 zoom-in-95">
                <div className="flex justify-center items-center bg-primary/20 shadow-[0_0_15px_rgba(255,190,0,0.3)] border border-primary/30 rounded-full w-10 h-10">
                  <Trophy size={20} className="text-primary" />
                </div>
                <h3 className="font-black text-primary text-base italic uppercase tracking-tighter">
                  Campaign Complete
                </h3>
                <p className="font-bold text-[9px] text-zinc-500 uppercase leading-none tracking-widest">
                  All targets secured.
                </p>
              </div>
            ) : secondaryGoals.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 font-black text-[8px] text-zinc-500 uppercase tracking-[0.3em]">
                    <Target size={10} className="text-primary" />
                    Target {goalIndex + 1}/{secondaryGoals.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setGoalIndex((prev) => Math.max(0, prev - 1))
                      }
                      className="disabled:opacity-10 text-zinc-600 hover:text-white transition-colors"
                      disabled={goalIndex === 0}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setGoalIndex((prev) =>
                          Math.min(secondaryGoals.length - 1, prev + 1),
                        )
                      }
                      className="disabled:opacity-10 text-zinc-600 hover:text-white transition-colors"
                      disabled={goalIndex === secondaryGoals.length - 1}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="group/item relative flex items-center pr-10 min-h-[40px]">
                  <div
                    className={`text-sm font-black italic uppercase leading-tight tracking-tight transition-all duration-300 ${isGoalCompleted(secondaryGoals[goalIndex]) ? 'text-zinc-600 line-through opacity-50' : 'text-primary'}`}
                  >
                    {secondaryGoals[goalIndex]}
                  </div>
                  {!isGoalCompleted(secondaryGoals[goalIndex]) && (
                    <button
                      onClick={() => markGoalSuccess(secondaryGoals[goalIndex])}
                      className="right-0 absolute flex justify-center items-center bg-primary/10 hover:bg-primary opacity-0 group-hover/item:opacity-100 shadow-lg border border-primary/20 rounded-full w-8 h-8 text-primary hover:text-black transition-all"
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                  )}
                </div>

                <div className="pt-2 border-zinc-800 border-t">
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
              <div className="flex flex-col justify-center items-center space-y-3 opacity-40 py-2 text-center">
                <div className="flex justify-center items-center border border-zinc-500 border-dashed rounded-full w-8 h-8">
                  <Target size={14} className="text-zinc-500" />
                </div>
                <div className="space-y-1">
                  <span className="block font-black text-[9px] text-zinc-400 uppercase tracking-[0.3em]">
                    No Targets
                  </span>
                  <span className="block font-bold text-[8px] text-zinc-600 uppercase tracking-wide">
                    System Standing By
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 bg-background/50 overflow-hidden">
        {/* Project Navigation Sidebar */}
        <div className="hidden md:flex flex-col bg-background/60 shadow-[1px_0_10px_rgba(0,0,0,0.02)] border-border border-r w-64">
          <div className="flex justify-between items-center p-6">
            <h3 className="flex items-center gap-2 font-black text-[10px] text-zinc-400 uppercase tracking-[0.2em]">
              <LayoutGrid size={12} /> Sectors
            </h3>
            <button
              onClick={() => setIsCreatingSector(true)}
              className="opacity-40 hover:opacity-100 transition-opacity"
              title="Create Sector"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 space-y-2 p-4 overflow-y-auto">
            <button
              onClick={() => setSelectedProjectId(null)}
              className={`w-full text-left p-4 rounded-xl transition-all font-black uppercase italic tracking-tighter text-sm flex items-center justify-between ${!selectedProjectId ? 'bg-zinc-900 text-primary shadow-xl scale-[1.02] dark:bg-primary dark:text-black border border-zinc-800' : 'hover:bg-muted text-muted-foreground'}`}
            >
              Master Feed
              <Badge
                variant="outline"
                className={`text-[10px] border-current opacity-50`}
              >
                {data.quests.length}
              </Badge>
            </button>
            <div className="opacity-50 mx-2 my-2 bg-border h-px" />
            {sortedProjects.map((project: any) => {
              const isSubSector = !!project.parent_id
              const indent = isSubSector ? 'pl-6' : ''
              const activeCount = data.quests.filter((q: any) => q.project_id === project.id).length
              return (
                <div key={project.id} className={`relative group ${indent}`}>
                  <button
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all font-black uppercase italic tracking-tighter text-sm flex flex-col gap-0.5 ${selectedProjectId === project.id ? 'bg-zinc-900 text-primary shadow-xl scale-[1.02] dark:bg-primary dark:text-black border border-zinc-800' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {/* Delete button on hover - positioned left of count */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSector(project.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-500 transition-all p-1"
                        title="Delete Sector"
                      >
                        <Trash2 size={12} />
                      </button>
                      <span className="flex-1">{project.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border-current opacity-50`}
                      >
                        {activeCount}
                      </Badge>
                    </div>
                    {/* Parent name aligned with sub-sector title */}
                    {isSubSector && project.parent_name && (
                      <span className="block font-mono text-[8px] opacity-50 tracking-wider pl-6">
                        {project.parent_name}
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="bg-muted/20 mt-auto p-6 border-border border-t">
            <div className="flex items-center gap-2 mb-1 font-black text-[9px] text-zinc-400 uppercase tracking-widest">
              <Wifi
                size={10}
                className={isConnected ? 'text-primary' : 'text-rose-500'}
              />
              Status: {isConnected ? 'Synchronized' : 'Standalone'}
            </div>
            <div className="font-bold text-[8px] text-zinc-300 uppercase tracking-widest">
              Vector Command Core v1.2
            </div>
          </div>
        </div>

        {/* Task Grid / Workspace */}
        <div className="flex flex-col flex-1 bg-zinc-50/20 dark:bg-zinc-950/10 overflow-hidden">
          {/* Work Zone Header */}
          <div className="top-0 z-30 sticky flex justify-between items-center bg-background/60 p-6 border-border border-b shrink-0">
            <div className="flex flex-1 items-center gap-4 md:gap-8 overflow-hidden">
              <div className="flex md:flex-row flex-col md:items-center gap-1 md:gap-8 overflow-hidden">
                <h2 className="font-black text-foreground text-xl truncate italic uppercase tracking-tight">
                  {selectedProjectId
                    ? data.projects.find((p: any) => p.id === selectedProjectId)
                        ?.name
                    : 'Active Operations'}
                </h2>

                {/* Mobile Project Selector */}
                <div className="md:hidden relative">
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) =>
                      setSelectedProjectId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="bg-zinc-100 dark:bg-zinc-900 py-1.5 pr-8 pl-3 border border-zinc-200 dark:border-zinc-800 rounded-lg w-full max-w-[200px] font-bold text-[10px] uppercase tracking-widest appearance-none"
                  >
                    <option value="">Master Feed</option>
                    {data.projects.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    size={12}
                    className="top-1/2 right-3 absolute text-zinc-500 rotate-90 -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </div>

              {/* Primary Objective Banner inside Work Zone */}
              {primaryObjective && (
                <div className="hidden md:flex items-center gap-3 bg-primary/10 slide-in-from-left-2 px-4 py-1.5 border border-primary/20 rounded-full animate-in fade-in">
                  <Target size={14} className="text-primary" />
                  <span className="font-black text-[10px] text-primary italic uppercase leading-none tracking-widest">
                    {primaryObjective}
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                setNewProjectId(
                  selectedProjectId || data.projects[0]?.id || null,
                )
                setIsAdding(true)
              }}
              disabled={isAdding}
              className="group relative bg-zinc-900 hover:bg-zinc-800 dark:bg-primary shadow-lg hover:shadow-primary/20 hover:shadow-xl px-6 border border-zinc-800 dark:border-primary/50 rounded-xl h-10 overflow-hidden font-black text-[10px] text-white dark:text-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <div className="absolute inset-0 bg-white/10 transition-transform translate-y-10 group-hover:translate-y-0 duration-300" />
              <div className="z-10 relative flex items-center gap-2">
                <Plus
                  className="w-4 h-4 text-primary dark:text-black group-hover:rotate-90 transition-transform duration-300"
                  strokeWidth={3}
                />
                <span>New Objective</span>
              </div>
            </Button>
          </div>

          <div className="flex-1 space-y-8 mx-auto p-4 md:p-8 w-full max-w-5xl overflow-y-auto">
            {isAdding && (
              <form
                onSubmit={handleCreateTask}
                className="group/form flex flex-col gap-6 slide-in-from-top-2 pb-8 border-zinc-800 border-b border-dashed text-foreground animate-in duration-300 fade-in"
              >
                {/* Top Row: Input and Action Buttons */}
                <div className="flex md:flex-row flex-col items-start md:items-end gap-6">
                  <div className="relative flex-1 space-y-2 w-full">
                    <label className="flex items-center gap-2 font-black text-[10px] text-primary uppercase tracking-[0.2em]">
                      <Target size={12} /> Operational Objective
                    </label>
                    <input
                      autoFocus
                      className="bg-transparent placeholder:opacity-50 py-2 border-zinc-700 focus:border-primary border-b-2 outline-none w-full font-black placeholder:text-zinc-800 text-3xl uppercase tracking-tighter transition-all"
                      placeholder="ENTER MISSION PARAMETERS..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
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
                          <span>Initialize</span>{' '}
                          <ChevronRight size={12} strokeWidth={4} />
                        </div>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="hover:bg-zinc-900 border border-transparent rounded-xl w-14 h-14 text-zinc-600 hover:text-white transition-all"
                      onClick={() => setIsAdding(false)}
                    >
                      <X size={20} />
                    </Button>
                  </div>
                </div>

                {/* Bottom Row: Controls */}
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  {/* Priority Toggle */}
                  <div className="space-y-1.5">
                    <span className="block font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
                      Threat Level
                    </span>
                    <div className="flex bg-zinc-900/50 p-1 border border-zinc-800 rounded-lg">
                      {['Low', 'Med', 'High'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewPriority(p)}
                          className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${
                            newPriority === p
                              ? p === 'High'
                                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                : p === 'Med'
                                  ? 'bg-zinc-700 text-white'
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
                  <div className="flex-1 space-y-1.5 min-w-[200px]">
                    <span className="block font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
                      Assigned Sector
                    </span>
                    <Select
                      value={newProjectId}
                      onChange={(val) => setNewProjectId(Number(val))}
                      options={data.projects.map((p: any) => ({
                        value: p.id,
                        label: p.name,
                      }))}
                      placeholder="Select Sector..."
                    />
                  </div>

                  <div className="hidden md:block opacity-30 ml-auto">
                    <span className="font-mono text-[9px] text-zinc-500">
                      ID: {Math.floor(Math.random() * 9999)}
                    </span>
                  </div>
                </div>
              </form>
            )}

            {/* Sector Creation Modal */}
            {isCreatingSector && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl slide-in-from-bottom-4 animate-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="flex items-center gap-2 font-black text-primary text-lg uppercase italic tracking-tighter">
                      <LayoutGrid size={20} /> New Sector
                    </h3>
                    <button
                      onClick={() => setIsCreatingSector(false)}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateSector} className="space-y-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 font-black text-[10px] text-primary uppercase tracking-[0.2em]">
                        <LayoutGrid size={12} /> Sector Name
                      </label>
                      <input
                        autoFocus
                        className="bg-transparent placeholder:opacity-50 py-2 border-zinc-700 focus:border-primary border-b-2 outline-none w-full font-black placeholder:text-zinc-800 text-xl uppercase tracking-tighter transition-all"
                        placeholder="ENTER SECTOR NAME..."
                        value={newSectorName}
                        onChange={(e) => setNewSectorName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                        <LayoutGrid size={12} /> Parent Sector (Optional)
                      </label>
                      <select
                        value={newSectorParent || ''}
                        onChange={(e) => setNewSectorParent(e.target.value ? Number(e.target.value) : null)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 w-full font-black text-sm uppercase tracking-wider text-zinc-300 outline-none focus:border-primary transition-colors"
                      >
                        <option value="">None (Top-Level Sector)</option>
                        {data.projects
                          .filter((p: any) => !p.parent_id)  // Only top-level for parent selection
                          .map((project: any) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                      </select>
                      <p className="font-mono text-[8px] text-zinc-600 uppercase tracking-wider">
                        Leave empty for top-level, select parent for sub-sector
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={isSubmittingSector || !newSectorName.trim()}
                        className="flex-1 h-12 font-black uppercase tracking-widest text-[10px] bg-primary text-black hover:bg-white rounded-xl transition-all"
                      >
                        {isSubmittingSector ? (
                          <span className="animate-pulse">Creating...</span>
                        ) : (
                          'Create Sector'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsCreatingSector(false)}
                        className="h-12 px-6 font-black uppercase tracking-widest text-[10px] text-zinc-500 hover:text-white rounded-xl transition-all"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-zinc-800/50 border-b">
                    <TableHead className="py-4 pl-0 font-black text-[9px] text-zinc-500 uppercase tracking-[0.3em]">
                      Mission Parameters
                    </TableHead>
                    <TableHead className="w-32 font-black text-[9px] text-zinc-500 text-center uppercase tracking-[0.3em]">
                      Threat
                    </TableHead>
                    <TableHead className="w-32 font-black text-[9px] text-zinc-500 text-center uppercase tracking-[0.3em]">
                      Status
                    </TableHead>
                    <TableHead className="w-40 font-black text-[9px] text-zinc-500 text-center uppercase tracking-[0.3em]">
                      Command
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuests.length > 0 ? (
                    filteredQuests.map((quest: any) => (
                      <TableRow
                        key={quest.id}
                        className="group hover:bg-zinc-900/30 border-zinc-800/50 last:border-0 border-b h-20 transition-all"
                      >
                        <TableCell className="py-4 pl-0">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                quest.priority === 'High'
                                  ? 'bg-primary shadow-[0_0_8px_var(--primary)]'
                                  : quest.priority === 'Med'
                                    ? 'bg-zinc-500'
                                    : 'border border-zinc-600 bg-transparent'
                              }`}
                            />
                            <div className="flex flex-col">
                              <p className="font-bold text-foreground group-hover:text-primary text-lg tracking-tight transition-colors">
                                {quest.title}
                              </p>
                              {/* Breadcrumb-style sector indicator with full path */}
                              <div className="flex items-center gap-1 mt-0.5 opacity-40 group-hover:opacity-70 transition-opacity">
                                <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-wider">
                                  {data.projects.find((p: any) => p.id === quest.project_id)?.path ||
                                   data.projects.find((p: any) => p.id === quest.project_id)?.name ||
                                   'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex font-black text-[9px] uppercase tracking-widest px-2 py-1 rounded border ${
                              quest.priority === 'High'
                                ? 'border-primary bg-primary text-black'
                                : quest.priority === 'Med'
                                  ? 'border-zinc-700 bg-zinc-800 text-zinc-300'
                                  : 'border-zinc-800 text-zinc-600 bg-transparent'
                            }`}
                          >
                            {quest.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center items-center gap-2 font-bold text-[9px] text-zinc-500 uppercase tracking-widest">
                            {quest.status === 'Working' ? (
                              <span className="text-primary animate-pulse">
                                In Progress
                              </span>
                            ) : (
                              <span>Pending</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center items-center opacity-60 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all">
                            {quest.status === 'Todo' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-transparent hover:bg-primary px-4 border border-zinc-700 hover:border-primary rounded-lg h-9 font-black text-[9px] hover:text-black tracking-[0.1em] transition-all"
                                onClick={() =>
                                  handleStatusUpdate(quest.id, 'Working')
                                }
                              >
                                ENGAGE
                              </Button>
                            )}
                            {quest.status === 'Working' && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-primary hover:bg-white shadow-[0_0_15px_rgba(255,190,0,0.3)] px-4 border border-primary rounded-lg h-9 font-black text-[9px] text-black tracking-[0.1em] transition-all"
                                  onClick={() =>
                                    handleStatusUpdate(quest.id, 'Done')
                                  }
                                >
                                  COMPLETE
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-zinc-800 p-0 rounded-lg w-9 h-9 text-zinc-500 hover:text-white"
                                  onClick={() =>
                                    handleStatusUpdate(quest.id, 'Todo')
                                  }
                                >
                                  <Pause size={14} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pr-0 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-rose-500 transition-colors"
                            onClick={() => handleDeleteTask(quest.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-24">
                        <div className="flex flex-col justify-center items-center gap-4 opacity-50 text-zinc-700">
                          <div className="flex justify-center items-center border border-zinc-700 border-dashed rounded-full w-12 h-12">
                            <CheckCircle2 size={20} />
                          </div>
                          <div className="text-center">
                            <p className="font-black text-sm uppercase tracking-[0.2em]">
                              Sector Clear
                            </p>
                            <p className="mt-1 font-mono text-[9px]">
                              NO ACTIVE HOSTILES
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {data.history && data.history.length > 0 && (
              <div className="space-y-6 mt-16 pb-20">
                <div className="flex items-center gap-4">
                  <h3 className="flex items-center gap-2 font-black text-[10px] text-zinc-400 uppercase tracking-[0.3em]">
                    <History size={14} /> Mission Record
                  </h3>
                  <div className="flex-1 opacity-30 bg-border h-px" />
                </div>
                <div className="gap-3 grid opacity-40 hover:opacity-100 transition-all duration-500">
                  {data.history.map((quest: any) => (
                    <div
                      key={quest.id}
                      className="group flex justify-between items-center bg-card shadow-sm hover:shadow-md p-5 border-2 border-border rounded-2xl transition-all"
                    >
                      <div className="flex flex-col">
                        <span className="font-black text-muted-foreground text-base line-through italic uppercase tracking-tighter">
                          {quest.title}
                        </span>
                        <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5">
                          {data.projects.find((p: any) => p.id === quest.project_id)?.path ||
                           data.projects.find((p: any) => p.id === quest.project_id)?.name ||
                           'Unknown'}
                        </span>
                      </div>
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 text-foreground transition-all translate-x-4 group-hover:translate-x-0 transform">
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-4 border-2 border-zinc-200 hover:border-zinc-900 rounded-lg h-8 font-black text-[9px] tracking-widest"
                          onClick={() => handleStatusUpdate(quest.id, 'Todo')}
                        >
                          RESTORE
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-rose-50 rounded-lg w-8 h-8 text-zinc-300 hover:text-rose-500"
                          onClick={() => handleDeleteTask(quest.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
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