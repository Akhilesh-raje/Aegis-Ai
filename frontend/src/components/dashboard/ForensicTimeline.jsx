import React, { useMemo } from 'react';
import { Clock, ChevronRight, Cpu, Network, Database, AlertCircle, Shield } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';

const STEP_ICONS = {
  recon: <Network className="w-4 h-4 text-[#3B82F6]" />,
  access: <Cpu className="w-4 h-4 text-[#F59E0B]" />,
  exfiltration: <Database className="w-4 h-4 text-[#EF4444]" />,
  lateral: <ChevronRight className="w-4 h-4 text-[#A855F7]" />,
};

export default function ForensicTimeline({ simPhase, activeAttack }) {
  const { data: liveThreats } = useAegisSocket('THREATS');
  const { data: socketStatus } = useAegisSocket('SIMULATION');
  
  const activeSim = socketStatus ? Object.values(socketStatus).reverse().find(s => s.status === 'running') : null;
  const threats = liveThreats ? liveThreats.slice(0, 10) : [];

  const serializedSteps = useMemo(() => {
    if (simPhase === 'attacking') {
      return [
        { id: 1, type: 'recon', action: `Reconnaissance Scan Detected`, source: 'Unknown Origin', time: 'LIVE', status: 'completed' },
        { id: 2, type: 'access', action: `Perimeter Breach: ${activeAttack?.name}`, source: 'External Vector', time: 'LIVE', status: 'active' },
        { id: 3, type: 'lateral', action: `Privilege Escalation Attempt`, source: 'SYSTEM_ROOT', time: 'LIVE', status: 'predicted' },
      ];
    }
    if (simPhase === 'mitigating') {
      return [
        { id: 1, type: 'access', action: `Perimeter Breach: ${activeAttack?.name}`, source: 'External Vector', time: 'LIVE', status: 'completed' },
        { id: 2, type: 'recon', action: `Threat Contained: Auto-Block`, source: 'AEGIS_BRAIN', time: 'NOW', status: 'completed', isMitigated: true },
      ];
    }

    // If a simulation is running, we anchor the timeline to its metadata
    if (activeSim) {
      const base = [
        { id: 1, type: 'recon', action: `Network Scan Target: local-node`, source: '185.23.44.12', time: 'LIVE', status: activeSim.progress >= 25 ? 'completed' : 'active' },
        { id: 2, type: 'access', action: `Brute Force Attempt: SSH/22`, source: '185.23.44.12', time: 'LIVE', status: activeSim.progress >= 50 ? 'completed' : (activeSim.progress >= 25 ? 'active' : 'predicted') },
        { id: 3, type: 'lateral', action: `Credential Harvest (Mimikatz)`, source: 'SYSTEM_ROOT', time: 'LIVE', status: activeSim.progress >= 75 ? 'completed' : (activeSim.progress >= 50 ? 'active' : 'predicted') },
        { id: 4, type: 'exfiltration', action: `Payload Deployment (Encryptor)`, source: 'local-node', time: 'LIVE', status: activeSim.progress >= 90 ? 'completed' : (activeSim.progress >= 75 ? 'active' : 'predicted') },
      ];
      
      // Check if any threat in the list is marked as "mitigated"
      const isMitigated = threats.some(t => t.status === 'mitigated' || t.is_blocked);
      if (isMitigated) {
        base.push({ id: 5, type: 'recon', action: `Threat Contained: AI Auto-Block`, source: 'AEGIS_BRAIN', time: 'NOW', status: 'completed', isMitigated: true });
      }

      return base;
    }

    // Default historical view if no simulation
    if (threats.length === 0) return [];
    
    const latest = threats[0];
    return [
      { id: 1, type: 'recon', action: `Inbound scan from ${latest.source_ip}`, source: latest.source_ip, time: '-12m', status: 'completed' },
      { id: 2, type: 'access', action: `Anomalous Login Detected`, source: latest.source_ip, time: '-8m', status: 'completed' },
      { id: 3, type: 'exfiltration', action: latest.explanation || latest.threat_type, source: 'Internal', time: '-2m', status: latest.status === 'mitigated' ? 'completed' : 'active' },
    ];
  }, [threats, activeSim, simPhase, activeAttack]);

  return (
    <div className="card-glow p-6 h-full flex flex-col bg-[#0B0F1A] relative overflow-hidden group hover:border-[#22D3EE]/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-8 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 flex items-center justify-center border border-[#22D3EE]/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <Clock className="w-5 h-5 text-[#22D3EE]" />
           </div>
           <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Forensic Chain</h3>
              <p className="text-xs text-[#9CA3AF] font-mono uppercase tracking-widest">Sequence Reconstruction {activeSim ? '// SIM_ACTIVE' : ''}</p>
           </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-widest font-mono shadow-[0_0_10px_rgba(239,68,68,0.1)] ${activeSim ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]' : 'bg-[#111827] border-white/10 text-[#9CA3AF]'}`}>
          {activeSim ? `CASE_${activeSim.id}` : 'STABLE_NODE'}
        </div>
      </div>

      {(serializedSteps.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50 text-center gap-3">
              <Clock className="w-10 h-10 text-[#9CA3AF]" />
              <div className="text-sm font-bold uppercase tracking-widest font-mono text-[#9CA3AF]">Awaiting Trace Data...</div>
          </div>
      ) : (
        <div className="flex-1 relative overflow-y-auto custom-scrollbar pr-2 min-h-0 container">
            <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-white/10 via-[#22D3EE]/30 to-[#EF4444]/30 z-0" />
    
            <div className="space-y-12 relative z-10">
              {serializedSteps.map((step, i) => (
                <div key={step.id} className="flex gap-6 group/step transition-all">
                  <div className="relative pt-1 flex-shrink-0">
                    <div className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all bg-[#0B0F1A] ${
                      step.status === 'active' ? 'border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 
                      step.status === 'predicted' ? 'border-[#6B7280] border-dashed opacity-50' :
                      step.isMitigated ? 'border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                      'border-[#22D3EE]'
                    }`}>
                      {step.isMitigated ? <Shield className="w-4 h-4 text-[#10B981]" /> : STEP_ICONS[step.type]}
                    </div>
                    {step.status === 'active' && <div className="absolute inset-0 bg-[#F59E0B]/10 blur-md rounded-full animate-pulse"></div>}
                  </div>
    
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold uppercase tracking-wider transition-colors ${
                        step.status === 'active' ? 'text-[#F59E0B]' : 
                        step.isMitigated ? 'text-[#10B981]' : (step.status === 'predicted' ? 'text-[#6B7280]' : 'text-white')
                      }`}>
                        {step.action}
                      </span>
                      <span className="text-xs font-bold font-mono text-[#6B7280] uppercase tracking-wider">{step.time}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-mono font-bold uppercase tracking-widest mb-3">
                      <span className="flex items-center gap-1.5 text-[#9CA3AF]"><Network className="w-4 h-4" /> {step.source}</span>
                      <span className="text-[#374151]">|</span>
                      <span className={`flex items-center gap-2 ${
                        step.status === 'active' ? 'text-[#F59E0B]' : 
                        step.isMitigated ? 'text-[#10B981]' : (step.status === 'predicted' ? 'text-[#6B7280]' : 'text-[#22D3EE]')
                      }`}>
                        {step.status === 'active' && <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse shadow-[0_0_8px_#F59E0B]"></span>}
                        {step.status}
                      </span>
                    </div>
    
                    {step.isMitigated && (
                      <div className="mt-4 p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
                        <div className="flex items-start gap-4">
                          <Shield className="w-5 h-5 text-[#10B981] mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-[#10B981] uppercase tracking-widest mb-1">Aegis Containment Success</div>
                            <div className="text-sm text-[#D1FAE5] font-mono leading-relaxed uppercase font-bold">
                              AI Decision Layer has successfully <span className="text-white">Isolated</span> the malicious principal. Threat neutralized.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
      )}

      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between relative z-10 shrink-0">
        <div className="text-xs font-bold font-mono text-[#9CA3AF] uppercase tracking-widest flex items-center gap-3">
           <span className="w-3 h-3 rounded-full bg-[#10B981] shadow-[0_0_8px_#10b981] animate-pulse"></span>
           [DVR] Active Record: <span className="text-[#10B981]">LIVE</span>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111827] border border-white/20 text-white text-xs font-bold uppercase tracking-wider hover:bg-[#22D3EE]/20 hover:text-[#22D3EE] hover:border-[#22D3EE]/40 transition-all">
          <Database className="w-4 h-4" /> 
          Pull PCAP DUMP
        </button>
      </div>
    </div>
  );
}
