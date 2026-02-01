import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardData, updateTaskStatus } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle2, RotateCcw, Pause, History } from 'lucide-react'

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

  const handleStatusUpdate = async (taskId: number, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus)
      router.invalidate()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Vector Command Center</h1>
          <p className="text-muted-foreground">Doni's Strategic Operations Dashboard</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Daily Momentum</p>
          <p className="text-5xl font-black text-primary">{data.xp} XP</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {data?.projects?.map((project: any) => (
          <Card key={project.name} className="border-2 text-zinc-900 dark:text-zinc-50">
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
          <CardTitle>Active Quests</CardTitle>
          <CardDescription>Missions currently in the field.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">Objective</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quick Actions</TableHead>
                <TableHead className="text-right">Friction</TableHead>
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
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {quest.nudge_count > 0 ? `${quest.nudge_count} nudges` : '--'}
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
                    <TableCell className="w-[100px]">
                       <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" title="Restore to Todo" onClick={() => handleStatusUpdate(quest.id, 'Todo')}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Undo
                      </Button>
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
