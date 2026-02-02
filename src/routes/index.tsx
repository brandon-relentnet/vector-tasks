import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardData, updateTaskStatus, createTask, deleteTask } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle2, RotateCcw, Pause, History, Plus, Trash2, X, Wifi, WifiOff } from 'lucide-react'
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
    
    socket.on('update', () => {
      console.log('Real-time update received')
      router.invalidate() // Triggers the loader to fetch fresh data
    })

    return () => {
      socket.disconnect()
    }
  }, [router])

  const handleStatusUpdate = async (taskId: number, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus)
      // No need for router.invalidate() here if the server emits 'update'
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

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">Vector Command Center</h1>
            {isConnected ? 
              <Wifi className="h-5 w-5 text-green-500" title="Live Sync Active" /> : 
              <WifiOff className="h-5 w-5 text-red-400" title="Live Sync Offline" />
            }
          </div>
          <p className="text-muted-foreground">Doni's Strategic Operations Dashboard</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Daily Momentum</p>
          <p className="text-5xl font-black text-primary">{data.xp} XP</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {data?.projects?.map((project: any) => (
          <Card 
            key={project.name} 
            className={`border-2 transition-colors cursor-pointer ${selectedProjectId === project.id ? 'border-primary bg-primary/5' : 'text-zinc-900 dark:text-zinc-50'}`}
            onClick={() => setSelectedProjectId(selectedProjectId === project.id ? null : project.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider">{project.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.active_count} Active Quests</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Quests Section */}
      <Card className="border-2 shadow-lg text-zinc-900 dark:text-zinc-50">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Quests</CardTitle>
              <CardDescription>Missions currently in the field.</CardDescription>
            </div>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
              <Plus className="h-4 w-4 mr-2" /> New Quest
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAdding && (
            <form onSubmit={handleCreateTask} className="mb-6 p-4 border-2 border-dashed rounded-lg flex gap-4 items-end bg-muted/30">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quest Objective</label>
                <input 
                  autoFocus
                  className="w-full bg-background border-2 rounded px-3 py-2 focus:border-primary outline-none"
                  placeholder="What needs doing?"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                />
              </div>
              <div className="w-48 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project</label>
                <select 
                  className="w-full bg-background border-2 rounded px-3 py-2 outline-none"
                  value={selectedProjectId || ''}
                  onChange={e => setSelectedProjectId(Number(e.target.value))}
                >
                  {data.projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}><X className="h-4 w-4" /></Button>
              </div>
            </form>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">Objective</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quick Actions</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.quests?.map((quest: any) => (
                <TableRow key={quest.id}>
                  <TableCell className="font-semibold text-lg">{quest.title}</TableCell>
                  <TableCell>
                    <Badge variant={quest.priority === 'High' ? 'destructive' : 'secondary'}>
                      {quest.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${quest.status === 'Working' ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`} />
                      {quest.status}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {quest.status === 'Todo' && (
                        <Button variant="outline" size="sm" className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" onClick={() => handleStatusUpdate(quest.id, 'Working')}>
                          <Play className="h-4 w-4 mr-1" /> Start
                        </Button>
                      )}
                      {quest.status === 'Working' && (
                        <>
                          <Button variant="outline" size="sm" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200" onClick={() => handleStatusUpdate(quest.id, 'Done')}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                          </Button>
                          <Button variant="ghost" size="sm" title="Pause" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                            <Pause className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTask(quest.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* History / Recently Completed Section */}
      {data.history && data.history.length > 0 && (
        <Card className="border-2 opacity-80 shadow-md bg-zinc-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Mission History
              </CardTitle>
              <CardDescription>Recently completed objectives.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {data.history.map((quest: any) => (
                  <TableRow key={quest.id} className="hover:bg-transparent">
                    <TableCell className="line-through text-muted-foreground italic">{quest.title}</TableCell>
                    <TableCell className="text-right w-[150px]">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" title="Restore to Todo" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                          <RotateCcw className="h-4 w-4 mr-1" /> Undo
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTask(quest.id)}>
                          <Trash2 className="h-4 w-4" />
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
