import { useState, useEffect } from 'react';
import { Bell, User, Shield, Activity, Globe, Cpu } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';
import { getRiskColor, formatTime } from '../../utils/helpers';
import DVRControls from '../dashboard/DVRControls';

export default function StatusBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: stats } = useAegisSocket('STATS');

  const riskLevel = stats?.risk_level || 'LOW';
  const riskColor = getRiskColor(riskLevel);

  return (
    <header className="h-12 min-h-12 glass-panel border-b border-white/5 flex items-center justify-between px-6 z-40">
      {/* Left: Environment & Breadcrumb */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Environment</span>
            <span className="text-xs font-bold text-[var(--color-accent)]">ANALYST_CONSOLE</span>
          </div>
        </div>
        
        <div className="h-4 w-px bg-white/5" />
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/5 border border-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-[9px] font-black text-[var(--color-success)] tracking-widest uppercase font-mono">WS_MESH: 10/10_ONLINE</span>
           </div>
           <div className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter font-mono">
              Latency: <span className="text-cyan-400">0.05ms</span>
           </div>
        </div>
      </div>

      {/* Center: Global Status Information */}
      <div className="flex items-center justify-center flex-1 gap-10">
        <DVRControls />
      </div>

      {/* Right: Telemetry & Profile */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)]">{formatTime(time)} UTC</span>
           <span className="text-[8px] font-bold text-[var(--color-accent)] opacity-60 tracking-tighter uppercase">Sync_Ready</span>
        </div>

        <div className="h-6 w-px bg-white/5" />

        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-xl bg-white/5 border border-white/5 hover:border-[var(--color-accent)]/30 hover:bg-white/10 transition-all group">
            <Bell className="w-4 h-4 text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)]" />
            {stats?.active_threats > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-danger)] text-[8px] flex items-center justify-center font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                {stats.active_threats}
              </span>
            )}
          </button>

          <button className="flex items-center gap-3 pl-1.5 pr-3 py-1 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/10 rounded-full hover:bg-[var(--color-accent)]/10 transition-all group">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#3b82f6] flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col items-start leading-tight">
               <span className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">Analyst</span>
               <span className="text-[8px] text-[var(--color-text-muted)] uppercase font-bold tracking-tighter">Level_04</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
