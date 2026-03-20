import { useMutation } from '@tanstack/react-query';
import { Zap, Shield, Lock, Activity, AlertCircle, CheckCircle2, ChevronRight, Play, Terminal, Search, ShieldAlert } from 'lucide-react';
import { executeResponse } from '../services/api';
import { useAegisSocket } from '../services/useAegisSocket';
import { getSeverityColor, timeAgo } from '../utils/helpers';

export default function SOAR() {
  const { data: liveThreats } = useAegisSocket('THREATS');
  const threats = liveThreats ? liveThreats.slice(0, 50) : undefined;

  const activeThreats = (threats || []).filter(t => t.status === 'active');
  const alleviationLog = (threats || []).filter(t => t.status === 'mitigated').slice(0, 10);

  const mutation = useMutation({
    mutationFn: ({ threatId, action, target }) => executeResponse(threatId, action, target),
  });

  const handleAction = (threatId, action, target) => {
    mutation.mutate({ threatId, action, target });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
         <div className="flex items-center gap-2 text-[var(--color-accent)] mb-1">
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Orchestration & Response</span>
         </div>
        <h2 className="text-3xl font-bold font-[var(--font-display)] tracking-tight">SOAR Center</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">Execute automated playbooks and manual containment actions to neutralize active threats identified by the Aegis engine.</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Active Incidents Console */}
        <div className="col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
               <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Unresolved Threats</h3>
               <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">{activeThreats.length} Active</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="text-[9px] text-[var(--color-accent)] font-mono animate-pulse uppercase tracking-widest font-bold">Aegis_XDR_Active</div>
            </div>
          </div>

          <div className="space-y-4">
            {activeThreats.length === 0 ? (
              <div className="glass-panel p-20 flex flex-col items-center justify-center text-center gap-4 group">
                 <div className="w-16 h-16 rounded-2xl bg-[var(--color-success)]/10 flex items-center justify-center border border-[var(--color-success)]/20 shadow-[0_0_50px_rgba(34,197,94,0.1)] transition-transform group-hover:scale-110">
                    <Shield className="w-8 h-8 text-[var(--color-success)]" />
                 </div>
                 <div>
                    <h4 className="text-xl font-bold tracking-tight">Perimeter Secure</h4>
                    <p className="text-sm text-[var(--color-text-muted)] max-w-xs mt-1">No pending containment actions required. System state is nominal.</p>
                 </div>
              </div>
            ) : (
              activeThreats.map((threat, i) => {
                const color = getSeverityColor(threat.severity);
                return (
                  <div key={threat.id} className="glass-panel overflow-hidden border-l-4 group slide-in relative" style={{ borderLeftColor: color, animationDelay: `${i * 100}ms` }}>
                    <div className="p-6 flex gap-8 items-center bg-black/10">
                      <div className="flex flex-col gap-4 flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:border-[var(--color-accent)]/30 transition-all">
                             <ShieldAlert className="w-6 h-6" style={{ color }} />
                          </div>
                          <div className="min-w-0">
                             <div className="text-lg font-black tracking-tight text-[var(--color-text-primary)] truncate">
                                {threat.explanation || threat.threat_type}
                             </div>
                             <div className="flex items-center gap-3 mt-0.5">
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.1em]" style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                                  {threat.severity}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500 uppercase">Detection_ID: {threat.id.slice(0, 8)}</span>
                             </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-6">
                           <StatusDetail label="Origin" value={threat.source_ip} />
                           <StatusDetail label="Asset" value="Local_Endpoint_01" />
                           <StatusDetail label="Confidence" value={`${(threat.confidence).toFixed(1)}%`} />
                           <StatusDetail label="Risk Score" value={`${Math.max(1, (threat.anomaly_score * 100)).toFixed(0)}`} color={color} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-48 shrink-0 relative z-10">
                        <button 
                          onClick={() => handleAction(threat.id, 'block_ip', threat.source_ip)}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            mutation.isPending && mutation.variables?.threatId === threat.id
                            ? 'bg-gray-800 text-gray-500'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                          }`}
                        >
                           {mutation.isPending && mutation.variables?.threatId === threat.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                           Block IP Source
                        </button>
                        <button 
                          onClick={() => handleAction(threat.id, 'rate_limit', threat.source_ip)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/20 transition-all font-mono"
                        >
                           <Zap className="w-3.5 h-3.5" />
                           Rate Limit Source
                        </button>
                        <div className="text-[8px] font-bold text-gray-600 uppercase text-center mt-1 tracking-tighter">Authorized Analyst Role Only</div>
                      </div>
                    </div>
                    {/* Timestamp footer */}
                    <div className="px-6 py-2 bg-black/30 flex items-center justify-between border-t border-white/5 opacity-60">
                        <div className="flex items-center gap-2 text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                           <Activity className="w-2.5 h-2.5" /> Signal detected {timeAgo(threat.timestamp)}
                        </div>
                        <div className="text-[8px] font-mono text-gray-500">Aegis_Internal_v4.2</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Operational Stats & History */}
        <div className="col-span-4 space-y-6">
           {/* Automated Playbooks */}
           <div className="glass-panel p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                 <Terminal className="w-4 h-4 text-[var(--color-accent)]" />
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Playbook Orchestrator</h3>
              </div>
              <div className="space-y-4">
                 <PlaybookItem title="AUTO_BLOCK_CRITICAL" enabled meta="Enabled (P0)" />
                 <PlaybookItem title="BEHAVIORAL_THROTTLE" enabled meta="Enabled (P2)" />
                 <PlaybookItem title="ZERO_DAY_ISOLATION" meta="Standby (Manual)" />
              </div>
           </div>

           {/* Mitigation Log */}
           <div className="glass-panel p-6 flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                 <Search className="w-4 h-4 text-[var(--color-accent)]" />
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Mitigation Timeline</h3>
              </div>
              <div className="space-y-5 overflow-y-auto max-h-[440px] pr-2 custom-scrollbar">
                 {alleviationLog.length === 0 ? (
                    <div className="py-12 text-center opacity-30 flex flex-col gap-2 scale-90">
                       <CheckCircle2 className="w-8 h-8 mx-auto" />
                       <div className="text-[10px] font-bold uppercase tracking-widest">No recent countermeasures</div>
                    </div>
                 ) : (
                    alleviationLog.map((t, i) => (
                       <div key={t.id} className="flex gap-4 text-[11px] slide-in group border-l border-white/10 pl-4 relative" style={{ animationDelay: `${i * 100}ms` }}>
                          <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]" />
                          <div className="space-y-1.5 flex-1 min-w-0">
                             <div className="flex items-center justify-between">
                                <span className="font-black text-[var(--color-text-primary)] uppercase tracking-tighter">Response Success</span>
                                <span className="text-[9px] font-mono text-[var(--color-success)] uppercase">100%</span>
                             </div>
                             <div className="text-[10px] text-gray-500 leading-tight">Neutralized: {t.explanation || t.threat_type}</div>
                             <div className="flex items-center justify-between text-[9px] font-mono text-gray-600">
                                <span>{t.id.slice(0, 8)}</span>
                                <span>{timeAgo(t.timestamp)}</span>
                             </div>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatusDetail({ label, value, color }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[8px] uppercase text-gray-600 tracking-widest font-black">{label}</div>
      <div className={`text-xs font-black font-mono tracking-tight truncate ${color ? '' : 'text-[var(--color-text-secondary)]'}`} style={color ? { color } : {}}>
        {value}
      </div>
    </div>
  );
}

function PlaybookItem({ title, enabled, meta }) {
  return (
    <div className={`p-4 rounded-xl transition-all border ${enabled ? 'bg-black/40 border-white/5' : 'bg-transparent border-white/5 opacity-50'}`}>
      <div className="flex items-center justify-between mb-2">
         <span className={`text-[10px] font-black uppercase tracking-widest ${enabled ? 'text-[var(--color-accent)]' : 'text-gray-500'}`}>{title}</span>
         <div className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? 'bg-[var(--color-accent)]' : 'bg-gray-800'}`}>
           <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
         </div>
      </div>
      <div className="text-[9px] font-mono text-gray-600">{meta}</div>
    </div>
  );
}
