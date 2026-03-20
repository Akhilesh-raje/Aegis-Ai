import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Swords, Zap, Bug, ShieldAlert, Play, Info, Search, Activity, ChevronRight, Lock, Repeat, Terminal } from 'lucide-react';
import { simulateAttack, startStatefulSimulation } from '../services/api';
import { useAegisSocket } from '../services/useAegisSocket';

const attacks = [
  {
    id: 'brute_force',
    name: 'Brute Force Attack',
    icon: ShieldAlert,
    description: 'Simulates multiple failed login attempts from a single source IP to brute force credentials.',
    mitre: 'T1110',
    intensity: 'High Frequency',
    impact: 'Credential Compromise',
    type: 'stateless'
  },
  {
    id: 'ddos',
    name: 'DDoS Attack',
    icon: Zap,
    description: 'Simulates a massive spike in network traffic from multiple sources to overwhelm system capacity.',
    mitre: 'T1498',
    intensity: 'Extreme Peak',
    impact: 'Service Disruption',
    type: 'stateless'
  },
  {
    id: 'port_scan',
    name: 'Port Scan',
    icon: Search,
    description: 'Simulates reconnaissance activity where an attacker probes multiple ports for open services.',
    mitre: 'T1046',
    intensity: 'Stealth Sweep',
    impact: 'Information Leakage',
    type: 'stateless'
  },
  {
    id: 'exfiltration',
    name: 'Data Exfiltration',
    icon: Bug,
    description: 'Simulates unauthorized transfer of sensitive data to an external location using covert channels.',
    mitre: 'T1041',
    intensity: 'Low and Slow',
    impact: 'Data Loss',
    type: 'stateless'
  },
  {
    id: 'ransomware_chain',
    name: 'Ransomware Chain',
    icon: Terminal,
    description: 'Stateful multi-stage attack: Recon -> Credential Access -> Lateral Movement -> Impact (Encryption).',
    mitre: 'T1486',
    intensity: 'Advanced Persistent',
    impact: 'System Lockdown',
    type: 'stateful'
  },
  {
    id: 'data_exfil_lateral',
    name: 'Lateral Exfiltration',
    icon: Repeat,
    description: 'Insider threat scenario: Compromised Account -> Lateral Discovery -> Data Exfiltration over C2.',
    mitre: 'T1041',
    intensity: 'Behavioral Outlier',
    impact: 'Intellectual Property Theft',
    type: 'stateful'
  }
];

export default function Simulation() {
  const queryClient = useQueryClient();
  const [selectedAttack, setSelectedAttack] = useState(attacks[4]); // Default to new stateful attack
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSims, setActiveSims] = useState({});

  const { data: socketSimData } = useAegisSocket('SIMULATION');

  useEffect(() => {
    if (socketSimData) {
      setActiveSims(socketSimData);
    }
  }, [socketSimData]);

  const statelessMutation = useMutation({
    mutationFn: (type) => simulateAttack(type),
    onSuccess: () => {
      setTimeout(() => setIsSimulating(false), 2000);
    }
  });

  const statefulMutation = useMutation({
    mutationFn: (scenario) => startStatefulSimulation(scenario),
    onSuccess: () => {
       setIsSimulating(false);
    }
  });

  const navigate = useNavigate();

  const handleSimulate = () => {
    setIsSimulating(true);
    if (selectedAttack.type === 'stateful') {
        statefulMutation.mutate(selectedAttack.id);
    } else {
        statelessMutation.mutate(selectedAttack.id);
    }
    // Auto-redirect to Dashboard after 1.5s so user watches the attack unfold
    setTimeout(() => navigate('/', { state: { simulationTriggered: true } }), 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
         <div className="flex items-center gap-2 text-[var(--color-accent)] mb-1">
            <Swords className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Adversary Emulation / War Room</span>
         </div>
        <h2 className="text-3xl font-bold font-[var(--font-display)] tracking-tight">Attack Simulation Engine</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">Validate AegisAI v4 detection capabilities by launching both atomic techniques and complex, stateful adversary chains.</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Tactical Selection */}
        <div className="col-span-4 space-y-4">
           <div className="px-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Simulation Library</div>
          {attacks.map((attack) => (
            <button
              key={attack.id}
              onClick={() => setSelectedAttack(attack)}
              className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                selectedAttack.id === attack.id
                  ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-[0_0_30px_rgba(0,229,255,0.1)]'
                  : 'bg-black/20 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-2.5 rounded-xl transition-all duration-300 ${selectedAttack.id === attack.id ? 'bg-[var(--color-accent)] text-black' : 'bg-white/5 text-gray-400 group-hover:text-white'}`}>
                  <attack.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-bold transition-colors ${selectedAttack.id === attack.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]'}`}>{attack.name}</h3>
                    {attack.type === 'stateful' && (
                        <span className="text-[7px] bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-1.5 py-0.5 rounded uppercase font-black">Stateful</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[9px] uppercase tracking-wider font-mono opacity-60">ID: {attack.mitre}</span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-all ${selectedAttack.id === attack.id ? 'text-[var(--color-accent)] translate-x-0' : 'text-gray-700 -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100'}`} />
              </div>
              {selectedAttack.id === attack.id && (
                 <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)]/5 to-transparent animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Center: Command Console */}
        <div className="col-span-8 flex flex-col gap-6">
          <div className="glass-panel p-10 flex-1 flex flex-col gap-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-10" />

            <div className="flex items-start justify-between relative z-10">
               <div className="flex items-center gap-6">
                  <div className="p-5 rounded-2xl bg-black/40 border border-white/10 text-[var(--color-accent)] shadow-[0_0_20px_rgba(0,0,0,0.4)]">
                    <selectedAttack.icon className="w-10 h-10" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-extrabold tracking-tight group-hover:text-glow">{selectedAttack.name}</h3>
                     <div className="flex items-center gap-4 mt-1 font-mono">
                        <span className="text-xs text-[var(--color-accent)] uppercase py-0.5 px-2 bg-[var(--color-accent)]/10 rounded">Technique: {selectedAttack.mitre}</span>
                        <span className="text-xs text-gray-500 uppercase">Class: {selectedAttack.type === 'stateful' ? 'Adversary_Emulation' : 'Atomic_Technique'}</span>
                     </div>
                  </div>
               </div>
               <div className="flex flex-col items-end gap-1">
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Environment Status</div>
                  <div className="flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                     <span className="text-[10px] font-bold text-[var(--color-success)]">ISOLATED_SANDBOX</span>
                  </div>
               </div>
            </div>

            <div className="relative z-10">
               <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Attack Objective</div>
               <p className="text-base text-[var(--color-text-secondary)] leading-relaxed italic border-l-2 border-[var(--color-accent)]/30 pl-6 py-2">
                 "{selectedAttack.description}"
               </p>
            </div>

            <div className="grid grid-cols-2 gap-6 relative z-10">
               <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                    <Zap className="w-4 h-4 text-[var(--color-warning)]" /> Operational Intensity
                  </div>
                  <div className="text-xl font-black text-[var(--color-text-primary)] font-mono">{selectedAttack.intensity}</div>
               </div>
               <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                    <Activity className="w-4 h-4 text-[var(--color-danger)]" /> Potential Impact
                  </div>
                  <div className="text-xl font-black text-[var(--color-text-primary)] font-mono">{selectedAttack.impact}</div>
               </div>
            </div>

            {/* Active Simulation Feedback for Stateful Scenarios */}
            {Object.keys(activeSims).length > 0 && selectedAttack.type === 'stateful' && (
                <div className="relative z-10 p-6 rounded-2xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 animate-in zoom-in-95 duration-300">
                    <div className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-widest mb-4">Real-time Simulation Status</div>
                    <div className="space-y-4">
                        {Object.entries(activeSims).filter(([_, s]) => s.scenario === selectedAttack.id).map(([id, sim]) => (
                            <div key={id} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-mono text-gray-400">{id}</span>
                                    <span className={`font-black uppercase tracking-tighter ${sim.status === 'completed' ? 'text-[var(--color-success)]' : 'text-[var(--color-accent)]'}`}>
                                        {sim.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-1000 ${sim.status === 'completed' ? 'bg-[var(--color-success)] w-full' : 'bg-[var(--color-accent)] w-1/2 animate-pulse'}`} />
                                    </div>
                                    <span className="text-[10px] font-bold font-mono text-white whitespace-nowrap">{sim.current_step}</span>
                                </div>
                            </div>
                        ))}
                        {Object.entries(activeSims).filter(([_, s]) => s.scenario === selectedAttack.id).length === 0 && (
                            <p className="text-xs text-gray-600 italic">No active executions for this technique.</p>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-auto pt-8 border-t border-white/5 flex flex-col items-center gap-6 relative z-10">
              <div className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em] flex items-center gap-2">
                 <Lock className="w-3 h-3" /> SECURITY_OATH_AUTHORIZED_v.2
              </div>
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className={`w-full py-5 rounded-2xl flex items-center justify-center gap-4 font-black transition-all duration-500 relative overflow-hidden group ${
                  isSimulating 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                  : 'bg-white text-black hover:bg-[var(--color-accent)] hover:text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(0,229,255,0.4)] scale-100 hover:scale-[1.01]'
                }`}
              >
                {isSimulating ? (
                  <div className="flex items-center gap-3">
                     <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                     <span className="tracking-[0.2em] font-mono">INITIALIZING EMULATION...</span>
                  </div>
                ) : (
                  <>
                     <Play className="w-5 h-5 fill-current" />
                     <span className="tracking-[0.4em] uppercase text-sm">Initiate Offensive Cycle</span>
                  </>
                )}
                {!isSimulating && (
                  <div className="absolute inset-0 bg-white/20 -translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/10 rounded-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Info className="w-16 h-16" />
             </div>
             <div className="p-2 rounded-lg bg-[var(--color-accent)]/10">
                <Info className="w-5 h-5 text-[var(--color-accent)]" />
             </div>
             <p className="text-xs text-[var(--color-text-muted)] leading-relaxed relative z-10">
               <strong className="text-[var(--color-text-primary)]">Protocol Zero Compliance:</strong> AegisAI v4 simulations use stateful emulation chains to validate behavioral detections. All events are cryptographically signed at the source to maintain telemetry audit logs.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
