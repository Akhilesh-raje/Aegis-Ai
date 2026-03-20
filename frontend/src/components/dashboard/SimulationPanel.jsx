import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity } from 'lucide-react';
import { startStatefulSimulation } from '../../services/api';
import socketManager, { useAegisSocket } from '../../services/useAegisSocket';

const SimulationPanel = () => {
  const [simulations, setSimulations] = useState({});
  const [loading, setLoading] = useState(false);

  const { data: socketData } = useAegisSocket('SIMULATION');

  useEffect(() => {
    if (socketData) {
      setSimulations(socketData);
    }
  }, [socketData]);

  const runSimulation = async (scenario) => {
    setLoading(true);
    try {
      await startStatefulSimulation(scenario);
    } catch (error) {
      console.error('Failed to start simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  const [logs, setLogs] = useState([
    { text: '[PROCESS] Initializing offensive context...', color: 'text-[#F59E0B]' },
    { text: '[TRACE] Kernel subsystems attached', color: 'text-[#9CA3AF]' }
  ]);
  const logContainerRef = useRef(null);

  useEffect(() => {
    const unsub = socketManager.subscribe('SIMULATION', (sims) => {
      if (!sims) return;
      Object.keys(sims).forEach(simId => {
        const sim = sims[simId];
        setLogs(prev => {
          const newLogs = [...prev, {
             text: `[SIM_ENGINE] ${sim.scenario} | STEP: ${sim.current_step} | STATUS: ${sim.status}`,
             color: sim.status === 'running' ? 'text-[#EF4444]' : 'text-[#22D3EE]'
          }].slice(-20);
          return newLogs;
        });
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const isRunning = Object.values(simulations).some(s => s?.status === 'running');

  return (
    <div className={`card-glow flex flex-col h-full bg-[#0B0F1A] relative overflow-hidden ${isRunning ? 'border-[#EF4444]/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}>
      
      {isRunning && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#EF4444]/5 animate-pulse"></div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#EF4444] to-transparent animate-scan-line"></div>
        </div>
      )}

      <div className="p-4 border-b border-white/10 flex items-center justify-between relative z-10 shrink-0 bg-[#0B0F1A]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${isRunning ? 'bg-[#EF4444]/15 border-[#EF4444]/30 animate-pulse' : 'bg-[#F59E0B]/15 border-[#F59E0B]/30'} flex items-center justify-center border`}>
            <Activity className={`w-5 h-5 ${isRunning ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Emulation Engine</h3>
            <p className="text-xs text-[#9CA3AF] font-mono uppercase tracking-widest">Adversary Behavior</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-bold font-mono tracking-widest ${isRunning ? 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]' : 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]'}`}>
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#EF4444] animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-[#F59E0B] shadow-[0_0_8px_#f59e0b]'}`}></span>
          {isRunning ? 'MISSION ACTIVE' : 'ENGINE READY'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar relative z-10">
        <div className="grid grid-cols-1 gap-3">
           <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Select Scenario:</div>
           <div className="grid grid-cols-2 gap-3">
             <button 
               className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/20 transition-all font-bold text-sm tracking-wider uppercase disabled:opacity-50"
               onClick={() => runSimulation('ransomware_chain')}
               disabled={loading || isRunning}
             >
               RANSOMWARE
             </button>
             <button 
               className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-all font-bold text-sm tracking-wider uppercase disabled:opacity-50"
               onClick={() => runSimulation('data_exfil_lateral')}
               disabled={loading || isRunning}
             >
               EXFILTRATION
             </button>
           </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Live Emulation Trace</h4>

          {Object.entries(simulations).length === 0 ? (
            <div className="py-8 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center opacity-50 gap-3">
               <span className="text-sm font-bold text-[#9CA3AF] uppercase tracking-widest">Idle State</span>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(simulations).reverse().slice(0, 1).map(([id, sim]) => (
                <div key={id} className={`p-4 rounded-xl bg-[#111827] border ${sim.status === 'running' ? 'border-[#EF4444]' : sim.status === 'completed' ? 'border-[#10B981]' : 'border-white/10'} flex flex-col gap-3 relative overflow-hidden shadow-2xl transition-all duration-500`}>
                  
                  {sim.status === 'running' && (
                    <div className="absolute top-0 left-0 h-1 bg-[#EF4444] w-full animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                  )}
                  {sim.status === 'completed' && (
                    <div className="absolute top-0 left-0 h-1 bg-[#10B981] w-full shadow-[0_0_10px_#10b981]"></div>
                  )}

                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-mono text-[#9CA3AF] font-bold uppercase tracking-widest">SID: {id.slice(0, 8)}</span>
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${sim.status === 'running' ? 'bg-[#EF4444] animate-pulse' : 'bg-[#10B981]'}`}></span>
                       <span className={`text-xs font-bold font-mono uppercase tracking-wider ${sim.status === 'running' ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{sim.status}</span>
                    </div>
                  </div>

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between text-sm font-bold text-white uppercase tracking-wider">
                        <span>{sim.scenario?.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-1 rounded text-xs tracking-widest ${sim.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>{sim.current_step}</span>
                    </div>
                    {sim.status === 'completed' && (
                        <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-700">
                             <div className="text-[10px] text-[#10B981] font-black uppercase tracking-[0.2em] mb-1">Mission Debrief</div>
                             <div className="text-xs text-white font-medium leading-relaxed">
                                Adversary objectives neutralized. AI detection latency: 1.4s. All lateral paths sealed.
                             </div>
                        </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-white/10 overflow-hidden flex flex-col h-40">
           <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
                 <Terminal className="w-4 h-4 text-[#F59E0B]" />
                 Kernel Sim Log
              </div>
           </div>
           <div 
             className="flex-1 bg-[#111827] rounded-xl p-3 font-mono text-xs overflow-y-auto space-y-2 custom-scrollbar border border-white/10"
             ref={logContainerRef}
           >
              {logs.map((log, i) => (
                <div key={i} className={`${log.color} py-1 border-b border-white/5 last:border-0`}>
                  <span className="text-[#6B7280] mr-2">[{new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
                  {log.text}
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPanel;
