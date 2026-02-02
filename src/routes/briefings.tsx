import { createFileRoute } from '@tanstack/react-router'
import { getBriefingHistory } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Moon, Calendar } from 'lucide-react'

export const Route = createFileRoute('/briefings')({
  loader: async () => await getBriefingHistory(),
  component: BriefingsPage,
})

function BriefingsPage() {
  const history = Route.useLoaderData()

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Mission Archives</h1>
        <p className="text-muted-foreground">Historical daily logs and strategic briefings.</p>
      </header>

      <div className="space-y-12">
        {history.map((log: any) => (
          <div key={log.id} className="relative pl-8 border-l-2 border-muted hover:border-primary transition-colors pb-4">
            <div className="absolute -left-[11px] top-0 bg-background p-1">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="mb-4">
              <span className="text-sm font-bold text-primary uppercase tracking-tighter">
                {new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="grid gap-6">
              {/* Morning Log */}
              <Card className="border-2 bg-zinc-50/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-600">
                    <Sparkles className="h-3 w-3" /> Morning Briefing
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="text-xl font-bold italic">"{log.morning_briefing || "No briefing recorded."}"</h3>
                  {log.starting_nudge && (
                    <div className="text-sm bg-background p-3 rounded border italic">
                      <span className="text-[10px] font-black uppercase block text-muted-foreground not-italic">Starting Nudge</span>
                      {log.starting_nudge}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Nightly Log (if exists) */}
              {log.nightly_reflection && (
                <Card className="border-2 border-indigo-100 bg-indigo-50/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-600">
                      <Moon className="h-3 w-3" /> Nightly Reflection
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <p className="text-muted-foreground leading-relaxed">{log.nightly_reflection}</p>
                    </div>
                    {log.goals_for_tomorrow?.length > 0 && (
                      <div className="md:w-64 space-y-2">
                        <span className="text-[10px] font-black uppercase text-indigo-400">Targeted Objectives</span>
                        <ul className="text-sm space-y-1 italic">
                          {log.goals_for_tomorrow.map((goal: string, i: number) => (
                            <li key={i}>• {goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
