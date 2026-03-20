import { useState, useEffect, useRef } from 'react';
import { ScrollText, Search, Filter, Trash2, Download, Terminal as TerminalIcon, Cpu, Activity, Database } from 'lucide-react';
import { useAegisSocket } from '../services/useAegisSocket';

export default function Logs() {
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const scrollRef = useRef(null);

  const { data } = useAegisSocket('TELEMETRY');

  const logs = data?.audit_logs || [];

  const filteredLogs = logs.filter(log => {
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesText = log.message.toLowerCase().includes(filter.toLowerCase()) || 
                       log.source.toLowerCase().includes(filter.toLowerCase());
    return matchesLevel && matchesText;
  });

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARNING': return 'text-amber-400';
      case 'SUCCESS': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
         <div className="flex items-center gap-2 text-[var(--color-accent)] mb-1">
            <ScrollText className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">System Forensics</span>
         </div>
        <h2 className="text-3xl font-bold font-[var(--font-display)] tracking-tight">System Event Matrix</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">Real-time stream of OS-level telemetry and AegisAI behavioral logs. Use filters to correlate cross-platform events.</p>
      </div>

      <div className="glass-panel flex-1 flex flex-col min-h-0 relative overflow-hidden bg-black/60">
        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(0,255,255,0.02),rgba(0,0,0,0),rgba(255,0,0,0.02))] bg-[length:100%_4px,3px_100%] z-20 opacity-30" />

        {/* Console Toolbar */}
        <div className="p-5 border-b border-white/5 bg-black/40 flex items-center justify-between gap-6 relative z-30">
          <div className="flex items-center gap-6 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Correlation query / grep..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-xs font-mono focus:border-[var(--color-accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all text-[var(--color-text-primary)] placeholder:text-gray-700"
              />
            </div>
            
            <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
              {['ALL', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-[0.1em] transition-all ${
                    levelFilter === lvl 
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] shadow-[0_0_15px_rgba(0,229,255,0.1)]' 
                    : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="h-8 w-px bg-white/5 mx-2" />
            <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
              <Download className="w-4 h-4 text-gray-400 group-hover:text-white" />
            </button>
            <button className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 transition-all group">
              <Trash2 className="w-4 h-4 text-red-400/60 group-hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Main Terminal View */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 font-mono text-[12px] leading-relaxed space-y-1.5 bg-[#050505] relative z-10 selection:bg-[var(--color-accent)]/30"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-700 gap-4 opacity-40">
               <Database className="w-12 h-12" />
               <div className="text-[10px] font-black uppercase tracking-[0.4em]">Historical buffer empty / No results</div>
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className="flex gap-6 group hover:bg-white/5 px-2 py-0.5 rounded-md transition-all whitespace-pre-wrap slide-in">
                <span className="text-gray-600 shrink-0 select-none font-bold opacity-70">
                  {new Date(log.timestamp * 1000).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 2 })}
                </span>
                <span className={`font-black shrink-0 w-16 select-none tracking-tighter ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-gray-500 shrink-0 w-36 truncate select-none border-x border-white/5 px-2 font-black italic">
                   @{log.source.toLowerCase()}
                </span>
                <span className="text-gray-300 flex-1 group-hover:text-white transition-colors">
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div className="h-10 pt-4 opacity-50 flex items-center gap-3">
             <div className="w-2 h-4 bg-[var(--color-accent)] animate-flicker"></div>
             <span className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-widest font-mono">Stream_listening_v2.4</span>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="px-6 py-3 bg-black/60 border-t border-white/5 flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest relative z-30">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <TerminalIcon className="w-3 h-3 text-[var(--color-accent)]" />
                 <span>Matrix: aegis_sys_01</span>
              </div>
              <div className="flex items-center gap-2">
                 <Activity className="w-3 h-3 text-[var(--color-success)]" />
                 <span className="text-[var(--color-success)]">Status: {filteredLogs.length > 0 ? 'Streaming' : 'Warm-up'}</span>
              </div>
           </div>
           <div className="flex items-center gap-6 font-mono">
              <div className="flex items-center gap-2">
                 <Cpu className="w-3 h-3" />
                 <span>P_Index: 0x24F</span>
              </div>
              <span>Captured: {logs.length}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
