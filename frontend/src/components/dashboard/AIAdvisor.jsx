import React from 'react';
import { Bot, ShieldCheck, Zap, Activity, Terminal, TrendingUp, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';
import { getSeverityColor } from '../../utils/helpers';

export default function AIAdvisor({ hero = false, onInvestigate, simPhase, activeAttack }) {
  const { data: insights } = useAegisSocket('INSIGHTS');

  const baseObservations = insights?.observations || [];
  const score = insights?.score?.total ?? 82;
  const probability = insights?.score?.probability ?? (100 - score);
  const baseline = insights?.score?.baseline ?? 35;
  const history = insights?.score?.history || [35, 38, 42, 45, probability];
  const verdict = insights?.verdict || "NORMAL";
  const trajectory = insights?.trajectory || { direction: "stable", rate: "0%/hr", primary_driver: "Nominal" };
  const narrative = insights?.attack_narrative || "Neural baseline is stable. No anomalous vectors detected.";
  const confidence = insights?.confidence || { total: 94.2, reasoning: ["Steady baseline."] };
  const timeline = insights?.timeline || [];

  const isAttacking = simPhase === 'attacking';
  const displayProbability = isAttacking ? 99 : probability;
  const displayVerdict = isAttacking ? "CRITICAL ALERT" : verdict;
  const displayTrajectory = isAttacking ? { direction: "increasing", rate: "99%/min", primary_driver: activeAttack?.name || "Zero-Day Exploit" } : trajectory;
  const displayNarrative = isAttacking 
    ? `[CRITICAL ALERT] Incoming ${activeAttack?.name || "Malicious Payload"} detected. Multiple perimeter breaches observed. Immediate intervention required.` 
    : simPhase === 'mitigating' ? `Executing Aegis Autonomous Remediation. Neutralizing ${activeAttack?.name || "threat"} patterns.` : narrative;

  const observations = isAttacking ? [
    {
      id: "sim-1", title: `Exploit Vector: ${activeAttack?.name || "Unknown"}`, source_engine: "Neural_Core", observed_at: new Date().toLocaleTimeString(),
      risk_level: "CRITICAL", confidence: 99, description: `High-frequency indicators matching ${activeAttack?.mitre || 'T1110'} observed targeting core nodes.`,
      service: "CORE", port: "MULTI", node: "aegis_sys_01", impact_statement: "System wide compromise imminent. Isolating.", recommendation: "Execute autonomous block on perimeter."
    },
    ...baseObservations.slice(0, 2)
  ] : baseObservations;

  return (
    <div className={`p-6 flex flex-col ${hero ? 'min-h-[640px]' : 'h-[560px]'} bg-gradient-to-br from-[#0f172a] to-[#111827] border border-[#22D3EE]/30 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.08)] overflow-hidden`}>
      
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 flex items-center justify-center border border-[#22D3EE]/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <Bot className="w-5 h-5 text-[#22D3EE]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Aegis Neural Advisor v6.0</h3>
            <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">Decision_Layer // Commander_Edition</p>
          </div>
        </div>
        
        <div className="flex items-center gap-5 bg-[#0B0F1A] px-4 py-2.5 rounded-lg border border-white/10">
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Trajectory:</span>
              <span className={`flex items-center gap-1.5 text-xs font-black ${displayTrajectory.direction === 'increasing' ? 'text-[#EF4444] animate-pulse' : 'text-[#10B981]'}`}>
                <TrendingUp className={`w-4 h-4 ${displayTrajectory.direction === 'increasing' ? '' : 'rotate-180'}`} /> 
                {displayTrajectory.direction.toUpperCase()} ({displayTrajectory.rate})
              </span>
           </div>
           <div className="w-px h-4 bg-white/10" />
           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Verdict:</span>
              <span className={`text-xs font-black uppercase ${displayProbability > 60 ? 'text-[#EF4444] animate-flicker' : displayProbability > 20 ? 'text-[#F59E0B]' : 'text-[#22D3EE]'}`}>{displayVerdict}</span>
           </div>
        </div>
      </div>

      {/* ═══ HERO: RISK SCORE + NARRATIVE ═══ */}
      <div className="mb-6 p-5 rounded-xl bg-[#0B0F1A] border border-white/10 relative overflow-hidden">
         <div className="flex items-center gap-6">
            {/* Risk Score Circle */}
            <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center bg-[#0B0F1A] overflow-hidden relative">
                   <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-0.5">Risk</span>
                      <span className={`text-3xl font-black font-mono leading-none ${displayProbability > 60 ? 'text-[#EF4444] animate-pulse' : 'text-white'}`}>{displayProbability}</span>
                      <span className="text-[10px] font-mono text-[#22D3EE] mt-0.5">/100</span>
                   </div>
                </div>
                <svg className="absolute top-0 left-0 w-24 h-24 -rotate-90">
                   <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                   <circle 
                      cx="48" cy="48" r="44" 
                      fill="none" stroke={displayProbability > 60 ? '#EF4444' : '#22D3EE'}
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={276} strokeDashoffset={276 - (276 * displayProbability / 100)}
                      style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 6px ${displayProbability > 60 ? '#EF4444' : '#22D3EE'})` }}
                   />
                </svg>
            </div>
            
            <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between mb-3">
                 <div className="text-sm font-bold text-[#22D3EE] uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-pulse" /> Forecasting & Attack Narrative
                 </div>
                 <div className="text-xs font-mono text-[#9CA3AF]">Baseline: {baseline}</div>
               </div>
               <p className="text-sm text-white leading-relaxed font-medium bg-white/5 p-3 rounded-lg border border-white/5">
                  "{narrative}"
               </p>
            </div>
         </div>
      </div>

      {/* ═══ INDICATORS ═══ */}
      <div className="grid grid-cols-2 gap-4 mb-6">
         <div className="p-4 rounded-xl bg-[#0B0F1A] border border-white/10 flex items-center gap-4 hover:border-[#EF4444]/30 transition-all">
            <div className="p-2.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/25">
               <ShieldAlert className="w-5 h-5 text-[#EF4444]" />
            </div>
            <div>
               <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Primary Risk Driver</div>
               <div className="text-sm font-bold text-[#EF4444] mt-0.5">{displayTrajectory.primary_driver}</div>
            </div>
         </div>
         <div className="p-4 rounded-xl bg-[#0B0F1A] border border-white/10 flex items-center gap-4 hover:border-[#22D3EE]/30 transition-all">
            <div className="p-2.5 rounded-lg bg-[#22D3EE]/15 border border-[#22D3EE]/25">
               <Zap className="w-5 h-5 text-[#22D3EE]" />
            </div>
            <div>
               <div className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">AI Confidence</div>
               <div className="text-sm font-bold text-[#22D3EE] mt-0.5" title={confidence.reasoning.join('\n')}>
                  {confidence.total}% — RELIABLE
               </div>
            </div>
         </div>
      </div>

      {/* ═══ OBSERVATIONS ═══ */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <div className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
           <Terminal className="w-4 h-4 text-[#22D3EE]" /> Top Forensic Observations
        </div>
        {observations.map((obs, i) => {
          const color = getSeverityColor(obs.risk_level);
          return (
            <div key={obs.id || i} className="p-5 rounded-xl bg-[#0B0F1A] border border-white/10 hover:border-[#22D3EE]/25 transition-all group">
              <div className="flex items-start justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                        <Terminal className="w-4 h-4" style={{ color }} />
                    </div>
                    <div>
                       <div className="text-base font-bold text-white">{obs.title}</div>
                       <div className="flex items-center gap-2 mt-1 text-xs text-[#9CA3AF]">
                          <span className="text-[#22D3EE]">{obs.source_engine || "Neural_Core"}</span>
                          <span>•</span>
                          <span>{obs.observed_at || "00:00:00"}</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    <div className="px-3 py-1 rounded-lg text-xs font-bold uppercase border"
                       style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}>
                       {obs.risk_level}
                    </div>
                    <div className="text-xs font-mono text-[#9CA3AF]">CNF: {obs.confidence ?? 85}%</div>
                 </div>
              </div>

              <div className="space-y-4">
                  <div className="text-sm text-[#9CA3AF] leading-relaxed pl-4 border-l-2 border-white/10">
                     {obs.description}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                     <div className="p-3 rounded-lg bg-[#111827] border border-white/5">
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Service</span>
                        <span className="text-sm font-mono text-white">{obs.service || 'N/A'}</span>
                     </div>
                     <div className="p-3 rounded-lg bg-[#111827] border border-white/5">
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Port</span>
                        <span className="text-sm font-mono text-white">{obs.port || 'N/A'}</span>
                     </div>
                     <div className="p-3 rounded-lg bg-[#111827] border border-white/5">
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Node</span>
                        <span className="text-sm font-mono text-white">{obs.node || 'local-host'}</span>
                     </div>
                  </div>

                  {obs.impact_statement && (
                     <div className="p-4 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/20 flex gap-3 items-start">
                        <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                        <div>
                           <span className="text-xs font-bold text-[#EF4444] uppercase block mb-1">⚠️ Impact Analysis</span>
                           <span className="text-sm text-white leading-relaxed">"{obs.impact_statement}"</span>
                        </div>
                     </div>
                  )}
                  
                  <div className="p-4 rounded-lg bg-[#22D3EE]/5 border border-[#22D3EE]/15">
                     <div className="flex items-center gap-2 mb-3">
                        <Bot className="w-4 h-4 text-[#22D3EE]" />
                        <span className="text-xs font-bold text-[#22D3EE] uppercase tracking-wider">⚡ AI Recommended Action</span>
                     </div>
                     <div className="text-sm text-white font-mono pl-3 border-l-2 border-[#22D3EE]/30 leading-relaxed mb-3">
                        {obs.recommendation}
                     </div>
                     {obs.remediation && (
                        <button 
                          onClick={() => onInvestigate && onInvestigate(obs)}
                          className="w-full py-3 rounded-lg bg-[#22D3EE] text-black text-sm font-bold uppercase tracking-wider hover:bg-[#06b6d4] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                        >
                           <ShieldCheck className="w-4 h-4" /> 
                           {obs.remediation.label}
                        </button>
                     )}
                  </div>
              </div>
            </div>
          );
        })}

        {observations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4 bg-[#0B0F1A] rounded-xl border border-white/10">
             <div className="w-16 h-16 rounded-full bg-[#10B981]/15 flex items-center justify-center border border-[#10B981]/25">
                <ShieldCheck className="w-8 h-8 text-[#10B981]" />
             </div>
             <div>
                <div className="text-lg uppercase font-black tracking-wider mb-1 text-white">🛡 All Systems Clear</div>
                <div className="text-sm text-[#9CA3AF]">Neural core reporting nominal state — Stability Matrix: HIGH</div>
             </div>
          </div>
        )}

        {timeline.length > 0 && (
           <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 mb-4">
                 <Clock className="w-4 h-4 text-[#9CA3AF]" />
                 <span className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider">Forensic Trail</span>
              </div>
              <div className="space-y-3 relative font-mono">
                 {timeline.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-4 group">
                       <span className="text-xs font-bold text-[#22D3EE]/60 w-14 shrink-0 text-right pt-0.5">{entry.time}</span>
                       <div className="w-2.5 h-2.5 rounded-full bg-white/10 border border-white/20 mt-1 group-hover:bg-[#22D3EE] transition-colors shrink-0" />
                       <div className="text-sm text-[#9CA3AF] group-hover:text-white transition-colors uppercase tracking-wider">{entry.event}</div>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="mt-6 pt-4 border-t border-white/10">
         <button className="w-full py-3 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/25 text-sm font-bold uppercase tracking-wider text-[#22D3EE] hover:bg-[#22D3EE]/20 hover:border-[#22D3EE]/40 transition-all">
            ⚡ Rerun Threat Analysis
         </button>
      </div>
    </div>
  );
}
