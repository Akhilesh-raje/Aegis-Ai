import React, { useMemo } from 'react';

const TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance', techniques: ['Active Scanning', 'Gather Victim Org Info', 'Phishing for Information'] },
  { id: 'TA0042', name: 'Resource Development', techniques: ['Acquire Infrastructure', 'Compromise Accounts', 'Develop Capabilities'] },
  { id: 'TA0001', name: 'Initial Access', techniques: ['Drive-by Compromise', 'Exploit Public-Facing App', 'Phishing', 'Valid Accounts'] },
  { id: 'TA0002', name: 'Execution', techniques: ['Command and Scripting', 'Scheduled Task', 'User Execution', 'WMI'] },
  { id: 'TA0003', name: 'Persistence', techniques: ['Boot or Logon AutoStart', 'Create Account', 'Scheduled Task'] },
  { id: 'TA0004', name: 'Privilege Escalation', techniques: ['Abuse Elevation Control', 'Valid Accounts'] },
  { id: 'TA0005', name: 'Defense Evasion', techniques: ['Deobfuscate/Decode', 'Impair Defenses', 'Indicator Removal', 'Masquerading'] },
  { id: 'TA0006', name: 'Credential Access', techniques: ['Brute Force', 'Credentials from Password Stores', 'OS Credential Dumping'] },
  { id: 'TA0007', name: 'Discovery', techniques: ['Account Discovery', 'Network Service Discovery', 'Process Discovery'] },
  { id: 'TA0008', name: 'Lateral Movement', techniques: ['Lateral Tool Transfer', 'Remote Services', 'Pass the Hash'] },
  { id: 'TA0009', name: 'Collection', techniques: ['Archive Collected Data', 'Data from Local System'] },
  { id: 'TA0011', name: 'Command and Control', techniques: ['Application Layer Protocol', 'Ingress Tool Transfer', 'Proxy'] },
  { id: 'TA0010', name: 'Exfiltration', techniques: ['Exfiltration Over C2 Channel', 'Data Transfer Size Limits'] },
  { id: 'TA0040', name: 'Impact', techniques: ['Data Destruction', 'Data Encrypted for Impact', 'Endpoint Denial of Service', 'Resource Hijacking'] }
];

export default function MitreHeatmap({ threats = [] }) {
  const techniqueCounts = useMemo(() => {
    const counts = {};
    threats.forEach(t => {
      if (t.mitre_name) {
        counts[t.mitre_name] = (counts[t.mitre_name] || 0) + 1;
      }
    });
    return counts;
  }, [threats]);

  const maxCount = Math.max(1, ...Object.values(techniqueCounts));

  const getHeatColor = (techName) => {
    const count = techniqueCounts[techName] || 0;
    if (count === 0) return 'bg-white/5 border-white/5 opacity-50';
    
    const intensity = count / maxCount;
    if (intensity > 0.7) return 'bg-red-500/80 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10';
    if (intensity > 0.3) return 'bg-orange-500/60 border-orange-400 text-white';
    return 'bg-yellow-500/40 border-yellow-400 text-white';
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[var(--color-bg-panel)] rounded-xl border border-[var(--color-border-subtle)] overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between shrink-0 bg-black/40">
         <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-widest">MITRE ATT&CK Matrix</h3>
            <span className="px-2 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[9px] font-mono font-bold tracking-widest border border-[var(--color-accent)]/30">Enterprise v14</span>
         </div>
         <div className="flex items-center gap-3 text-[9px] font-mono uppercase text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-white/5 border border-white/10" /> None</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-yellow-500/40 border border-yellow-400" /> Low</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-orange-500/60 border border-orange-400" /> Med</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500/80 border border-red-400" /> High</div>
         </div>
      </div>
      
      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-6 bg-black/20">
         <div className="flex gap-2 min-w-max pb-4">
            {TACTICS.map((tactic) => (
              <div key={tactic.id} className="flex flex-col gap-2 w-40 shrink-0">
                 {/* Column Header */}
                 <div className="bg-white/10 border border-white/20 rounded p-2 text-center relative group">
                    <div className="text-[10px] font-mono text-[var(--color-accent)] mb-0.5">{tactic.id}</div>
                    <div className="text-xs font-bold leading-tight line-clamp-2 min-h-[34px] flex items-center justify-center">
                        {tactic.name}
                    </div>
                    {/* Active Tactic Bar */}
                    {tactic.techniques.some(tech => techniqueCounts[tech] > 0) && (
                       <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-accent)] rounded-t" />
                    )}
                 </div>

                 {/* Techniques */}
                 <div className="flex flex-col gap-2">
                    {tactic.techniques.map((tech) => {
                       const count = techniqueCounts[tech] || 0;
                       return (
                         <div 
                           key={tech} 
                           className={`p-2 rounded border text-[10px] leading-snug transition-all relative group cursor-default
                             ${getHeatColor(tech)}
                           `}
                         >
                            {tech}
                            {count > 0 && (
                               <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center text-[9px] font-mono font-bold shadow-lg">
                                  {count}
                               </div>
                            )}
                         </div>
                       );
                    })}
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
