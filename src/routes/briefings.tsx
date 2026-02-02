import { createFileRoute } from '@tanstack/react-router'
import { getBriefingHistory } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Sparkles, Moon, Calendar, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/briefings')({
  loader: async () => await getBriefingHistory({ limit: 5, offset: 0 }),
  component: BriefingsPage,
})

function BriefingsPage() {
  const initialData = Route.useLoaderData()
  const [history, setHistory] = useState(initialData)
  const [page, setPage] = useState(0)
  const [limit] = useState(5)
  const [filter, setFilter] = useState<{ morning: boolean; night: boolean }>({ morning: false, night: false })

  const fetchHistory = async (newPage: number, activeFilters: typeof filter) => {
    const data = await getBriefingHistory({ 
      limit, 
      offset: newPage * limit,
      has_morning: activeFilters.morning || undefined,
      has_night: activeFilters.night || undefined
    })
    setHistory(data)
  }

  const toggleFilter = (type: 'morning' | 'night') => {
    const newFilters = { ...filter, [type]: !filter[type] }
    setFilter(newFilters)
    setPage(0)
    fetchHistory(0, newFilters)
  }

  const handlePageChange = (direction: number) => {
    const newPage = page + direction
    setPage(newPage)
    fetchHistory(newPage, filter)
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Mission Archives</h1>
          <p className="text-muted-foreground">Historical daily logs and strategic briefings.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground ml-2" />
          <Button 
            variant={filter.morning ? "default" : "ghost"} 
            size="sm" 
            onClick={() => toggleFilter('morning')}
            className="text-xs font-bold"
          >
            Morning Only
          </Button>
          <Button 
            variant={filter.night ? "default" : "ghost"} 
            size="sm" 
            onClick={() => toggleFilter('night')}
            className="text-xs font-bold"
          >
            Nightly Only
          </Button>
        </div>
      </header>

      <div className="space-y-12 min-h-[400px]">
        {history.length > 0 ? history.map((log: any) => (
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
              {log.morning_briefing && (
                <Card className="border-2 bg-zinc-50/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-600">
                      <Sparkles className="h-3 w-3" /> Morning Briefing
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-xl font-bold italic">"{log.morning_briefing}"</h3>
                    {log.starting_nudge && (
                      <div className="text-sm bg-background p-3 rounded border italic">
                        <span className="text-[10px] font-black uppercase block text-muted-foreground not-italic">Starting Nudge</span>
                        {log.starting_nudge}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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
        )) : (
          <div className="text-center py-20 border-2 border-dashed rounded-xl opacity-50">
            <p className="text-lg font-medium">No archived missions match these filters.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t pt-8">
        <span className="text-sm text-muted-foreground font-medium">
          Page {page + 1}
        </span>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 0}
            onClick={() => handlePageChange(-1)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            disabled={history.length < limit}
            onClick={() => handlePageChange(1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
