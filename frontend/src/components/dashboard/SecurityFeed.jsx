import { useMutation } from '@tanstack/react-query';
import { ShieldAlert, Terminal, ChevronRight, Activity, Cpu, Database, User } from 'lucide-react';
import { executeResponse } from '../../services/api';
import { useAegisSocket } from '../../services/useAegisSocket';
import { getSeverityColor } from '../../utils/helpers';

export default function SecurityFeed({ compact = false }) {
  const { data: liveThreats } = useAegisSocket('THREATS');
  const threats = liveThreats ? liveThreats.slice(0, compact ? 12 : 8) : undefined;

  const mutation = useMutation({
    mutationFn: ({ threatId, action, target }) => executeResponse(threatId, action, target),
  });

  const handleAction = (threatId, action, target) => {
    mutation.mutate({ threatId, action, target });
  };

  return (
    <div className={`card-glow flex flex-col bg-[#0B0F1A] hover:border-[#22D3EE]/30 transition-all overflow-hidden ${compact ? 'h-full border-0' : 'p-5 h-full'}`}>
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 flex items-center justify-center border border-[#22D3EE]/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <Terminal className="w-5 h-5 text-[#22D3EE] animate-pulse" />
           </div>
           <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Signal Terminal</h3>
              <p className="text-xs text-[#9CA3AF] font-mono uppercase tracking-widest">Neural Telemetry</p>
           </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-[#9CA3AF] font-bold uppercase">
           <span className="flex items-center gap-1.5 transition-colors">
             <Activity className="w-4 h-4 text-[#10B981]" /> EPS: 1.4K
           </span>
           <span className="flex items-center gap-1.5 transition-colors">
             <Cpu className="w-4 h-4 text-[#22D3EE]" /> LOAD: 12%
           </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {(!threats || threats.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-50 text-center gap-3 border border-dashed border-white/10 rounded-xl">
             <ShieldAlert className="w-10 h-10 text-[#6B7280]" />
             <div className="text-sm font-bold uppercase tracking-widest font-mono text-[#6B7280]">Awaiting Telemetry Ingress...</div>
          </div>
        ) : (
          threats.map((threat, i) => {
            const isCritical = threat.severity === 'critical';
            const color = isCritical ? '#EF4444' : (threat.severity === 'warning' ? '#F59E0B' : '#22D3EE');

            return (
              <div
                key={threat.id || i}
                className="bg-[#111827] border border-white/10 p-4 rounded-xl flex flex-col gap-3 group hover:border-[#22D3EE]/40 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#22D3EE]/20 transition-colors" style={{ backgroundColor: isCritical ? '#EF4444' : undefined }} />
                
                <div className="flex items-center justify-between text-xs font-mono text-[#6B7280] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-3">
                    <span className="text-[#22D3EE]">[{new Date(threat.timestamp || Date.now()).toLocaleTimeString([], { hour12: false })}]</span>
                    <span>PID_{Math.floor(Math.random() * 9000) + 1000}</span>
                    <span className="flex items-center gap-1 uppercase"><User className="w-3 h-3" /> {threat.principal || 'SYSTEM'}</span>
                  </div>
                  <span className="opacity-50">{threat.id?.slice(0, 8) || 'AUTO_SIG'}</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-sm font-bold uppercase tracking-wider ${isCritical ? 'text-[#EF4444]' : 'text-white'}`}>
                        {threat.explanation || threat.threat_type}
                      </span>
                      {threat.is_simulation && (
                        <span className="px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-bold uppercase tracking-wider border border-[#F59E0B]/20">
                          SIM
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-[#9CA3AF] font-bold">
                      <span className="flex items-center gap-1.5"><Database className="w-4 h-4 text-[#6B7280]" /> src: {threat.source_ip}</span>
                      <span className="text-[#6B7280]">»»</span>
                      <span className="text-[#22D3EE]">TARGET NODE</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${isCritical ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' : 'bg-[#111827] text-white border-white/20'}`}>
                        {threat.severity}
                      </span>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                    <button 
                      onClick={() => handleAction(threat.id, 'block_ip', threat.source_ip)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/30 transition-all"
                      title="Block Source IP"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0B0F1A] hover:bg-[#22D3EE]/20 text-[#6B7280] hover:text-[#22D3EE] border border-white/20 hover:border-[#22D3EE]/40 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
        <div className="text-xs font-black font-mono text-[#9CA3AF] uppercase tracking-widest flex items-center gap-3">
           <span className="flex items-center gap-2">
             <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10b981]"></span>
             AI FORECAST: <span className="text-[#10B981]">STABLE</span>
           </span>
           <span className="text-[#374151]">|</span>
           <span className="font-bold">Ingestion Rate: 142 pps</span>
        </div>
      </div>
    </div>
  );
}
