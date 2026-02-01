import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardData, updateTaskStatus } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle2, Circle } from 'lucide-react'

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const data = await getDashboardData()
      return data
    } catch (error) {
      console.error('Loader error:', error)
      return { xp: 0, quests: [], projects: [] }
    }
  },
  component: Dashboard,
})

function Dashboard() {
  const data = Route.useLoaderData()
  const router = useRouter()

  const handleStatusChange = async (taskId: number, currentStatus: string) => {
    let nextStatus = 'Todo'
    if (currentStatus === 'Todo') nextStatus = 'Working'
    else if (currentStatus === 'Working') nextStatus = 'Done'
    else if (currentStatus === 'Done') nextStatus = 'Todo'

    try {
      await updateTaskStatus(taskId, nextStatus)
      router.invalidate() // Refresh the loader data
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

      <Card className="border-2 shadow-lg text-zinc-900 dark:text-zinc-50">
        <CardHeader>
          <CardTitle>Active Quests</CardTitle>
          <CardDescription>Top priority missions currently in the field.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">Objective</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="text-right">ADHD Friction</TableHead>
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
                      <span className={`h-2 w-2 rounded-full ${quest.status === 'Working' ? 'bg-blue-500 animate-pulse' : quest.status === 'Done' ? 'bg-green-500' : 'bg-slate-400'}`} />
                      {quest.status}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => handleStatusChange(quest.id, quest.status)}
                    >
                      {quest.status === 'Todo' && <><Play className="h-4 w-4" /> Start</>}
                      {quest.status === 'Working' && <><CheckCircle2 className="h-4 w-4" /> Complete</>}
                      {quest.status === 'Done' && <><Circle className="h-4 w-4" /> Reset</>}
                    </Button>
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
    </div>
  )
}
