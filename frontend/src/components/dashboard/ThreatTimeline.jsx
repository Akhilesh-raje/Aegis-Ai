import { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';

export default function ThreatTimeline() {
  const { data: history } = useAegisSocket('RISK_HISTORY');
  const { data: liveSimStatus } = useAegisSocket('SIMULATION');
  const ObjectSimStatus = liveSimStatus ?? {};
  const activeSim = Object.values(ObjectSimStatus || {}).reverse()[0];
  const isRunning = activeSim?.status === 'running';
  
  // Tactical Phase Mapping
  const phases = [
    { label: 'RECON', icon: '🔍', match: ['Reconnaissance'] },
    { label: 'ACCESS', icon: '🔓', match: ['Initial Access'] },
    { label: 'C2', icon: '📡', match: ['Command and Control', 'Lateral Movement'] },
    { label: 'EXFIL', icon: '🎯', match: ['Exfiltration', 'Encryption'] }
  ];

  const currentPhaseIdx = phases.findIndex(p => p.match.some(m => activeSim?.current_step?.includes(m)));

  const timelineEvents = (history || []).map((item) => ({
    time: new Date(item.timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
    title: item.title || 'Anomalous Activity Detected',
    score: item.score,
    level: item.level,
  })).reverse().slice(0, 10);

  return (
    <div className={`level-3-container p-5 flex flex-col h-full bg-[#050b18] group overflow-hidden transition-all duration-700 ${isRunning ? 'border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.02)]' : ''}`}>
      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
           <div className={`w-8 h-8 rounded bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)] ${isRunning ? 'animate-pulse' : ''}`}>
              <Activity className="w-4 h-4 text-red-400" />
           </div>
           <div>
              <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] font-mono">Threat_Chronicle_v8.4</h3>
              <p className="text-[8px] text-gray-600 font-mono uppercase">Temporal_Attack_Sequencing</p>
           </div>
        </div>
        {isRunning && (
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 animate-in fade-in zoom-in">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-[8px] font-black text-red-400 uppercase tracking-widest font-mono">Tracing_Breach</span>
          </div>
        )}
      </div>
      
      {/* TACTICAL PHASE MONITOR */}
      <div className="mb-8 grid grid-cols-4 gap-2 relative">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 -z-10"></div>
        {phases.map((phase, i) => {
          const isActive = isRunning && i <= currentPhaseIdx;
          const isCurrent = isRunning && i === currentPhaseIdx;
          
          return (
            <div key={phase.label} className="flex flex-col items-center gap-2 group/phase">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] transition-all duration-500 ${
                isCurrent ? 'bg-red-500 border-red-400 text-white shadow-[0_0_15px_#ef4444] scale-110' :
                isActive ? 'bg-red-500/40 border-red-500/50 text-red-200' :
                'bg-white/5 border-white/10 text-gray-700'
              }`}>
                {phase.icon}
              </div>
              <span className={`text-[7px] font-black font-mono transition-colors duration-500 ${
                isActive ? 'text-red-400' : 'text-gray-700'
              }`}>
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="relative border-l border-white/5 ml-2 pl-6 space-y-6 py-2">
          {timelineEvents.length === 0 ? (
            <div className="text-[10px] font-mono text-gray-600 italic py-4">Listening for temporal signatures...</div>
          ) : (
            timelineEvents.map((event, idx) => (
              <div key={idx} className="relative group/event">
                {/* Timeline Dot */}
                <div className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#050b18] z-10 
                  ${event.score > 70 ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 
                    event.score > 40 ? 'bg-yellow-500 shadow-[0_0_8px_#eab308]' : 
                    'bg-cyan-500 shadow-[0_0_8px_#06b6d4]'} 
                  transition-all group-hover/event:scale-125`}>
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black font-mono text-gray-500">{event.time}</span>
                    <span className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded border ${
                      event.score > 70 ? 'text-red-400 border-red-500/20 bg-red-500/5' : 
                      event.score > 40 ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' : 
                      'text-cyan-400 border-cyan-500/20 bg-cyan-500/5'
                    }`}>
                      IDX_{event.score.toFixed(0)}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-gray-300 uppercase tracking-tight group-hover/event:text-white transition-colors">
                    {event.title}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
