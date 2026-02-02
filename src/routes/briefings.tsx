import { createFileRoute } from '@tanstack/react-router'
import { Calendar, History as HistoryIcon, LogOut, Moon, Sparkles, Target, Zap } from 'lucide-react'
import { useState } from 'react'
import { getBriefingHistory } from '../data/dashboard-fns'
import { Card, CardContent } from '@/components/ui/card'
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
  const [masterFilter, setMasterFilter] = useState<'all' | 'morning' | 'midday' | 'shutdown' | 'night'>('all')
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
    setLocalOverrides({})
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
    <div className="p-8 space-y-10 max-w-5xl mx-auto pb-20 text-foreground">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Mission Archives</h1>
            <div className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-border">
              <HistoryIcon className="h-3 w-3" />
              Tactical Records
            </div>
          </div>
          <p className="text-muted-foreground font-medium tracking-tight italic opacity-70 uppercase text-xs">Reviewing Operational Logs and Historical Progression.</p>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-900 dark:bg-zinc-950 p-1.5 rounded-2xl shadow-xl border-b-4 border-zinc-800">
          <Button 
            variant={masterFilter === 'all' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => handleMasterFilter('all')}
            className={`text-[10px] font-black uppercase px-4 h-9 tracking-widest transition-all ${masterFilter === 'all' ? 'bg-primary text-zinc-900 hover:bg-primary/90' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
          >
            All
          </Button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          {['morning', 'midday', 'shutdown', 'night'].map((f) => (
            <Button 
              key={f}
              variant={masterFilter === f ? "default" : "ghost"} 
              size="sm" 
              onClick={() => handleMasterFilter(f as any)}
              className={`text-[10px] font-black uppercase px-4 h-9 tracking-widest transition-all ${masterFilter === f ? 'bg-primary text-zinc-900 hover:bg-primary/90' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              {f}
            </Button>
          ))}
        </div>
      </header>

      <div className="space-y-12 min-h-[400px]">
        {history.length > 0 ? history.map((log: any) => {
          const activeTab = localOverrides[log.id] || (masterFilter !== 'all' ? masterFilter : 'morning');
          
          return (
            <div key={log.id} className="relative pl-12 border-l-4 border-border hover:border-primary/40 transition-all pb-4 group">
              <div className="absolute -left-[14px] top-0 bg-background ring-8 ring-background rounded-full p-0.5">
                <div className="bg-zinc-900 dark:bg-zinc-950 rounded-full p-1.5 group-hover:bg-primary transition-colors shadow-xl border border-zinc-800">
                  <Calendar className="h-4 w-4 text-white group-hover:text-zinc-900 transition-colors" />
                </div>
              </div>
              
              <div className="mb-6 flex items-center gap-6">
                <span className="text-xl font-black text-foreground uppercase tracking-tighter italic">
                  {new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <div className="h-px flex-1 bg-border opacity-50" />
              </div>

              <Card className="border-2 border-border overflow-hidden shadow-sm rounded-2xl transition-all bg-card">
                <div className="flex border-b border-border bg-muted/30 backdrop-blur-md">
                  {[
                    { id: 'morning', icon: <Sparkles className="h-3.5 w-3.5" />, label: 'Morning' },
                    { id: 'midday', icon: <Zap className="h-3.5 w-3.5" />, label: 'Mid-Day' },
                    { id: 'shutdown', icon: <LogOut className="h-3.5 w-3.5" />, label: 'Shutdown' },
                    { id: 'night', icon: <Moon className="h-3.5 w-3.5" />, label: 'Nightly' }
                  ].map((tab) => {
                    const exists = tab.id === 'morning' ? log.morning_briefing : tab.id === 'midday' ? log.midday_briefing : tab.id === 'shutdown' ? log.shutdown_briefing : log.nightly_reflection;
                    return (
                      <button 
                        key={tab.id}
                        onClick={() => setLocalTab(log.id, tab.id)}
                        disabled={!exists}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-10 ${
                          activeTab === tab.id 
                            ? `bg-background text-foreground shadow-sm border-x border-border first:border-l-0 last:border-r-0` 
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                      >
                        <span className={activeTab === tab.id ? "text-primary" : ""}>{tab.icon}</span>
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                <CardContent className="p-10 min-h-[180px] flex flex-col justify-center">
                  {activeTab === 'morning' && (
                    <div className="space-y-6 text-center md:text-left">
                      <p className="text-3xl font-black italic tracking-tight leading-tight text-foreground">"{log.morning_briefing || "Awaiting Intelligence..."}"</p>
                      {log.starting_nudge && (
                        <div className="p-5 bg-muted border border-border rounded-xl flex items-center gap-5 max-w-2xl">
                          <Zap className="h-6 w-6 text-primary shrink-0" />
                          <div>
                            <span className="text-[10px] font-black uppercase text-muted-foreground block mb-1 tracking-widest">Starting Nudge</span>
                            <p className="font-bold text-foreground text-lg leading-tight uppercase italic">{log.starting_nudge}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'midday' && (
                    <p className="text-3xl font-black italic tracking-tight leading-tight text-foreground">"{log.midday_briefing}"</p>
                  )}

                  {activeTab === 'shutdown' && (
                    <p className="text-3xl font-black italic tracking-tight leading-tight text-foreground">"{log.shutdown_briefing}"</p>
                  )}

                  {activeTab === 'night' && (
                    <div className="flex flex-col md:flex-row gap-12">
                      <div className="flex-1">
                        <p className="text-2xl font-black text-foreground leading-relaxed italic">"{log.nightly_reflection}"</p>
                      </div>
                      {log.goals_for_tomorrow?.length > 0 && (
                        <div className="md:w-80 p-8 bg-muted rounded-2xl border border-border shadow-sm flex flex-col justify-center">
                          <span className="text-[10px] font-black uppercase text-muted-foreground block mb-5 tracking-widest flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" /> Tomorrow's Targets
                          </span>
                          <ul className="space-y-4">
                            {log.goals_for_tomorrow.map((goal: string, i: number) => (
                              <li key={i} className="flex gap-4 text-sm font-bold items-start leading-snug">
                                <span className="bg-foreground text-background h-5 w-5 rounded flex items-center justify-center shrink-0 text-[10px] font-black">{i + 1}</span> 
                                <span className="text-foreground italic uppercase">{goal}</span>
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
          <div className="text-center py-32 border-4 border-dashed rounded-[2rem] opacity-20 bg-muted border-border">
            <p className="text-3xl font-black uppercase tracking-tighter italic text-muted-foreground">No Intelligence Records Found</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t-2 border-border pt-12">
        <div className="bg-zinc-900 dark:bg-zinc-950 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg border border-zinc-800">
          Log Phase {page + 1}
        </div>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 0}
            onClick={() => handlePageChange(-1)}
            className="font-black uppercase tracking-widest text-[10px] border-2 border-border hover:border-foreground hover:bg-foreground hover:text-background h-12 px-8 rounded-xl transition-all"
          >
            Back
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={history.length < limit}
            onClick={() => handlePageChange(1)}
            className="font-black uppercase tracking-widest text-[10px] border-2 border-border hover:border-foreground hover:bg-foreground hover:text-background h-12 px-8 rounded-xl transition-all"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
