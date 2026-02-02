import { createFileRoute } from '@tanstack/react-router'
import { getBriefingHistory } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Sparkles, Moon, Calendar, ChevronLeft, ChevronRight, Filter, Zap, LogOut } from 'lucide-react'
import { useState } from 'react'
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
    const newFilters = {
      morning: type === 'morning' ? !filter.morning : false,
      night: type === 'night' ? !filter.night : false
    }
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
          <p className="text-muted-foreground">Historical daily logs and tactical progress.</p>
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
          <div key={log.id} className="relative pl-8 border-l-2 border-muted hover:border-primary transition-colors pb-8">
            <div className="absolute -left-[11px] top-0 bg-background p-1">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="mb-6">
              <span className="text-sm font-bold text-primary uppercase tracking-tighter">
                {new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="grid gap-4">
              {/* Morning Section */}
              {log.morning_briefing && (
                <Card className="border shadow-sm">
                  <CardHeader className="py-3 px-4 flex flex-row items-center gap-2 text-amber-600 border-b bg-amber-50/10">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Morning Briefing</span>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-lg font-bold italic leading-tight">"{log.morning_briefing}"</p>
                    {log.starting_nudge && (
                      <div className="text-sm p-2 bg-muted/30 rounded border border-dashed flex items-center gap-2">
                        <Zap className="h-3 w-3 text-primary" />
                        <span className="font-medium text-muted-foreground">{log.starting_nudge}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Mid-Day Section */}
              {log.midday_briefing && (
                <Card className="border shadow-sm border-blue-100">
                  <CardHeader className="py-3 px-4 flex flex-row items-center gap-2 text-blue-600 border-b bg-blue-50/10">
                    <Zap className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Mid-Day Pivot</span>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="font-medium leading-relaxed italic">"{log.midday_briefing}"</p>
                  </CardContent>
                </Card>
              )}

              {/* Shutdown Section */}
              {log.shutdown_briefing && (
                <Card className="border shadow-sm border-zinc-200">
                  <CardHeader className="py-3 px-4 flex flex-row items-center gap-2 text-zinc-600 border-b bg-zinc-50">
                    <LogOut className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Shutdown Ritual</span>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="font-medium leading-relaxed italic text-zinc-700">"{log.shutdown_briefing}"</p>
                  </CardContent>
                </Card>
              )}

              {/* Nightly Section */}
              {log.nightly_reflection && (
                <Card className="border-2 border-indigo-100 bg-indigo-50/10">
                  <CardHeader className="py-3 px-4 flex flex-row items-center gap-2 text-indigo-600 border-b bg-indigo-100/20">
                    <Moon className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Nightly Reflection</span>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <p className="text-muted-foreground leading-relaxed">{log.nightly_reflection}</p>
                    </div>
                    {log.goals_for_tomorrow?.length > 0 && (
                      <div className="md:w-64 p-3 bg-white rounded border border-indigo-100 shadow-inner">
                        <span className="text-[10px] font-black uppercase text-indigo-400 block mb-2">Targeted Objectives</span>
                        <ul className="text-sm space-y-1 italic">
                          {log.goals_for_tomorrow.map((goal: string, i: number) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-indigo-300">•</span>
                              <span>{goal}</span>
                            </li>
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
