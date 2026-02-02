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
  // Master filter controls what all cards show by default
  const [masterFilter, setMasterFilter] = useState<'all' | 'morning' | 'midday' | 'shutdown' | 'night'>('all')
  // Track local tab overrides for individual cards
  const [localOverrides, setLocalOverrides] = useState<Record<number, string>>({})

  const fetchHistory = async (newPage: number, activeFilter: string) => {
    const data = await getBriefingHistory({ 
      limit, 
      offset: newPage * limit,
      has_morning: activeFilter === 'morning' || undefined,
      has_night: activeFilter === 'night' || undefined
    })
    setHistory(data)
  }

  const handleMasterFilter = (type: typeof masterFilter) => {
    setMasterFilter(type)
    setPage(0)
    setLocalOverrides({}) // Clear local overrides when master changes
    fetchHistory(0, type)
  }

  const handlePageChange = (direction: number) => {
    const newPage = page + direction
    setPage(newPage)
    fetchHistory(newPage, masterFilter)
  }

  const setLocalTab = (logId: number, tab: string) => {
    setLocalOverrides(prev => ({ ...prev, [logId]: tab }))
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Mission Archives</h1>
          <p className="text-muted-foreground">Historical daily logs and tactical progress.</p>
        </div>
        
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border">
          <Button 
            variant={masterFilter === 'all' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => handleMasterFilter('all')}
            className="text-[10px] font-black uppercase px-2 h-7"
          >
            All
          </Button>
          <Button 
            variant={masterFilter === 'morning' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => handleMasterFilter('morning')}
            className="text-[10px] font-black uppercase px-2 h-7"
          >
            Morning
          </Button>
          <Button 
            variant={masterFilter === 'midday' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => handleMasterFilter('midday')}
            className="text-[10px] font-black uppercase px-2 h-7"
          >
            Mid-Day
          </Button>
          <Button 
            variant={masterFilter === 'shutdown' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => handleMasterFilter('shutdown')}
            className="text-[10px] font-black uppercase px-2 h-7"
          >
            Shutdown
          </Button>
          <Button 
            variant={masterFilter === 'night' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => handleMasterFilter('night')}
            className="text-[10px] font-black uppercase px-2 h-7"
          >
            Nightly
          </Button>
        </div>
      </header>

      <div className="space-y-8 min-h-[400px]">
        {history.length > 0 ? history.map((log: any) => {
          // Determine which tab to show: local override OR master filter OR first available
          const activeTab = localOverrides[log.id] || (masterFilter !== 'all' ? masterFilter : 'morning');
          
          return (
            <div key={log.id} className="relative pl-8 border-l-2 border-muted hover:border-primary transition-colors pb-4">
              <div className="absolute -left-[11px] top-0 bg-background p-1">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <div className="mb-4">
                <span className="text-sm font-bold text-primary uppercase tracking-tighter">
                  {new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              <Card className={`border-2 overflow-hidden shadow-sm transition-colors ${
                activeTab === 'night' ? 'border-indigo-100 bg-indigo-50/5' :
                activeTab === 'shutdown' ? 'border-zinc-200 bg-zinc-50/50' :
                activeTab === 'midday' ? 'border-blue-100 bg-blue-50/5' :
                'border-amber-100 bg-amber-50/5'
              }`}>
                {/* Tabs Header */}
                <div className="flex border-b bg-muted/30">
                  <button 
                    onClick={() => setLocalTab(log.id, 'morning')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'morning' ? 'bg-background text-amber-600 border-r border-l first:border-l-0' : 'text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <Sparkles className="h-3 w-3" /> Morning
                  </button>
                  <button 
                    onClick={() => setLocalTab(log.id, 'midday')}
                    disabled={!log.midday_briefing}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-30 ${activeTab === 'midday' ? 'bg-background text-blue-600 border-r border-l' : 'text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <Zap className="h-3 w-3" /> Mid-Day
                  </button>
                  <button 
                    onClick={() => setLocalTab(log.id, 'shutdown')}
                    disabled={!log.shutdown_briefing}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-30 ${activeTab === 'shutdown' ? 'bg-background text-zinc-600 border-r border-l' : 'text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <LogOut className="h-3 w-3" /> Shutdown
                  </button>
                  <button 
                    onClick={() => setLocalTab(log.id, 'night')}
                    disabled={!log.nightly_reflection}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-30 ${activeTab === 'night' ? 'bg-background text-indigo-600 border-l' : 'text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <Moon className="h-3 w-3" /> Nightly
                  </button>
                </div>

                <CardContent className="p-6 min-h-[140px] flex flex-col justify-center">
                  {activeTab === 'morning' && (
                    <div className="space-y-4">
                      <p className="text-xl font-bold italic leading-tight">"{log.morning_briefing || "No morning briefing recorded."}"</p>
                      {log.starting_nudge && (
                        <div className="text-sm p-3 bg-background rounded border border-dashed flex items-center gap-2">
                          <Zap className="h-3 w-3 text-primary" />
                          <span className="font-medium">{log.starting_nudge}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'midday' && (
                    <p className="text-xl font-bold italic leading-tight text-blue-700">"{log.midday_briefing}"</p>
                  )}

                  {activeTab === 'shutdown' && (
                    <p className="text-xl font-bold italic leading-tight text-zinc-700">"{log.shutdown_briefing}"</p>
                  )}

                  {activeTab === 'night' && (
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <p className="text-muted-foreground leading-relaxed italic">"{log.nightly_reflection}"</p>
                      </div>
                      {log.goals_for_tomorrow?.length > 0 && (
                        <div className="md:w-64 p-3 bg-white rounded border border-indigo-100 shadow-inner">
                          <span className="text-[10px] font-black uppercase text-indigo-400 block mb-2 tracking-tighter">Targeted Objectives</span>
                          <ul className="text-xs space-y-1 italic">
                            {log.goals_for_tomorrow.map((goal: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-indigo-300">•</span>
                                <span>{goal}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        }) : (
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
