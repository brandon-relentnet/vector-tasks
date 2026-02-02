import { createFileRoute } from '@tanstack/react-router'
import { getBriefingHistory } from '../data/dashboard-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Sparkles, Moon, Calendar, ChevronLeft, ChevronRight, Filter, Zap, LogOut, History as HistoryIcon } from 'lucide-react'
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
    <div className="p-8 space-y-8 max-w-5xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-zinc-900 dark:text-zinc-50">Mission Archives</h1>
            <div className="bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border">
              <HistoryIcon className="h-3 w-3" />
              Historical Logs
            </div>
          </div>
          <p className="text-muted-foreground font-medium tracking-tight">Reviewing Tactical Progression and Daily Briefings.</p>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-900 p-1.5 rounded-xl shadow-lg border-b-4 border-primary">
          <Button 
            variant={masterFilter === 'all' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => handleMasterFilter('all')}
            className={`text-[10px] font-black uppercase px-3 h-8 tracking-widest ${masterFilter === 'all' ? 'bg-primary text-black hover:bg-primary/90' : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'}`}
          >
            All
          </Button>
          <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
          {['morning', 'midday', 'shutdown', 'night'].map((f) => (
            <Button 
              key={f}
              variant={masterFilter === f ? "default" : "ghost"} 
              size="sm" 
              onClick={() => handleMasterFilter(f as any)}
              className={`text-[10px] font-black uppercase px-3 h-8 tracking-widest ${masterFilter === f ? 'bg-primary text-black hover:bg-primary/90' : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'}`}
            >
              {f}
            </Button>
          ))}
        </div>
      </header>

      <div className="space-y-10 min-h-[400px]">
        {history.length > 0 ? history.map((log: any) => {
          const activeTab = localOverrides[log.id] || (masterFilter !== 'all' ? masterFilter : 'morning');
          
          return (
            <div key={log.id} className="relative pl-10 border-l-4 border-zinc-100 hover:border-primary transition-all pb-4 group">
              <div className="absolute -left-[14px] top-0 bg-white ring-4 ring-white rounded-full p-0.5">
                <div className="bg-zinc-900 rounded-full p-1 group-hover:bg-primary transition-colors shadow-lg">
                  <Calendar className="h-4 w-4 text-white group-hover:text-black transition-colors" />
                </div>
              </div>
              
              <div className="mb-6 flex items-center gap-4">
                <span className="text-lg font-black text-zinc-900 uppercase tracking-tighter italic">
                  {new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <div className="h-[1px] flex-1 bg-zinc-100" />
              </div>

              <Card className={`border-2 overflow-hidden shadow-xl transition-all ${
                activeTab === 'night' ? 'border-indigo-400 bg-indigo-50/5' :
                activeTab === 'shutdown' ? 'border-zinc-400 bg-zinc-50/50' :
                activeTab === 'midday' ? 'border-blue-400 bg-blue-50/5' :
                'border-amber-400 bg-amber-50/5'
              }`}>
                <div className="flex border-b bg-zinc-900">
                  {[
                    { id: 'morning', icon: <Sparkles />, color: 'text-amber-400', label: 'Morning' },
                    { id: 'midday', icon: <Zap />, color: 'text-blue-400', label: 'Mid-Day' },
                    { id: 'shutdown', icon: <LogOut />, color: 'text-zinc-400', label: 'Shutdown' },
                    { id: 'night', icon: <Moon />, color: 'text-indigo-400', label: 'Nightly' }
                  ].map((tab) => (
                    <button 
                      key={tab.id}
                      onClick={() => setLocalTab(log.id, tab.id)}
                      disabled={tab.id === 'morning' ? !log.morning_briefing : tab.id === 'midday' ? !log.midday_briefing : tab.id === 'shutdown' ? !log.shutdown_briefing : !log.nightly_reflection}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20 ${
                        activeTab === tab.id 
                          ? `bg-white ${tab.color.replace('-400', '-600')} shadow-inner scale-[1.02] z-10 rounded-t-lg mx-1 mt-1` 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {activeTab === tab.id ? tab.icon : null}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <CardContent className="p-8 min-h-[160px] flex flex-col justify-center">
                  {activeTab === 'morning' && (
                    <div className="space-y-6">
                      <p className="text-2xl font-bold italic tracking-tight leading-tight text-zinc-800">"{log.morning_briefing || "Awaiting Intelligence..."}"</p>
                      {log.starting_nudge && (
                        <div className="p-4 bg-white rounded-lg border-2 border-dashed border-amber-200 flex items-center gap-4">
                          <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                          <div>
                            <span className="text-[10px] font-black uppercase text-amber-600 block mb-0.5 tracking-widest">Starting Nudge</span>
                            <p className="font-bold text-zinc-800">{log.starting_nudge}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'midday' && (
                    <p className="text-2xl font-bold italic tracking-tight leading-tight text-blue-700">"{log.midday_briefing}"</p>
                  )}

                  {activeTab === 'shutdown' && (
                    <p className="text-2xl font-bold italic tracking-tight leading-tight text-zinc-700">"{log.shutdown_briefing}"</p>
                  )}

                  {activeTab === 'night' && (
                    <div className="flex flex-col md:flex-row gap-10">
                      <div className="flex-1">
                        <p className="text-lg font-medium text-zinc-600 leading-relaxed italic">"{log.nightly_reflection}"</p>
                      </div>
                      {log.goals_for_tomorrow?.length > 0 && (
                        <div className="md:w-72 p-6 bg-white rounded-xl border-2 border-indigo-100 shadow-xl flex flex-col justify-center">
                          <span className="text-[10px] font-black uppercase text-indigo-500 block mb-4 tracking-widest flex items-center gap-2">
                            <Target className="h-3 w-3" /> Targeted Objectives
                          </span>
                          <ul className="space-y-3">
                            {log.goals_for_tomorrow.map((goal: string, i: number) => (
                              <li key={i} className="flex gap-3 text-xs font-bold items-start leading-tight">
                                <span className="bg-indigo-100 text-indigo-600 h-4 w-4 rounded flex items-center justify-center shrink-0 text-[8px]">{i + 1}</span> 
                                <span className="text-zinc-700 italic">{goal}</span>
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
          <div className="text-center py-24 border-4 border-dashed rounded-3xl opacity-30">
            <p className="text-2xl font-black uppercase tracking-tighter italic">No Archived Missions Found</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t-2 border-zinc-100 pt-10">
        <div className="bg-zinc-900 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px]">
          Phase {page + 1}
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 0}
            onClick={() => handlePageChange(-1)}
            className="font-black uppercase tracking-widest text-[10px] border-2 h-10 px-6"
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            disabled={history.length < limit}
            onClick={() => handlePageChange(1)}
            className="font-black uppercase tracking-widest text-[10px] border-2 h-10 px-6"
          >
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
