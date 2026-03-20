import React, { useState, useEffect, useRef } from 'react';
import { Globe, Activity, MapPin, Bot, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAegisSocket } from '../services/useAegisSocket';
import WorldMap from '../components/dashboard/WorldMap';
import SecurityScore from '../components/dashboard/SecurityScore';
import FleetHealthMatrix from '../components/dashboard/FleetHealthMatrix';
import AIAdvisor from '../components/dashboard/AIAdvisor';
import ChatPanel from '../components/dashboard/ChatPanel';
import AttackFlowStory from '../components/dashboard/AttackFlowStory';
import TrafficGraph from '../components/dashboard/TrafficGraph';
import SimulationPanel from '../components/dashboard/SimulationPanel';
import KernelSimLog from '../components/dashboard/KernelSimLog';
import IdentityPanel from '../components/dashboard/IdentityPanel';
import StreamingAuditLog from '../components/dashboard/StreamingAuditLog';
import SecurityFeed from '../components/dashboard/SecurityFeed';
import ExposurePanel from '../components/dashboard/ExposurePanel';
import ForensicTimeline from '../components/dashboard/ForensicTimeline';
import InvestigationPanel from '../components/dashboard/InvestigationPanel';

function SectionDivider({ label, icon }) {
  return (
    <div className="flex items-center gap-4 mt-8 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#22D3EE]/30 to-transparent" />
      <div className="flex items-center gap-2 bg-[#111827] border border-[#22D3EE]/20 rounded-lg px-4 py-1.5 shadow-[0_0_12px_rgba(34,211,238,0.06)]">
        <span className="text-[#22D3EE] text-sm">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#22D3EE] whitespace-nowrap">{label}</span>
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-[#22D3EE]/30 via-transparent to-transparent" />
    </div>
  );
}


function ActiveTunnel() {
  const { data: telemetry } = useAegisSocket('TELEMETRY');

  return (
    <div className="card-glow p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#22D3EE]" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Active Tunnel</span>
        </div>
        <span className="text-xs font-bold text-[#10B981] px-2 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/20">● ONLINE</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/15 flex items-center justify-center border border-[#3B82F6]/25">
          <Activity className="w-4 h-4 text-[#3B82F6]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">{telemetry?.context?.isp || 'NordVPN'}</div>
          <div className="text-xs text-[#22D3EE] font-mono">{telemetry?.context?.public_ip || '82.85.178.109'}</div>
        </div>
        <MapPin className="w-4 h-4 text-[#9CA3AF]" />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
        <div className="bg-[#0B0F1A] p-2 rounded-lg border border-white/5 text-center">
          <div className="text-[10px] text-[#6B7280] font-bold uppercase">Ping</div>
          <div className="text-sm font-bold font-mono text-white">{telemetry?.context?.latency?.toFixed(0) || 40}ms</div>
        </div>
        <div className="bg-[#0B0F1A] p-2 rounded-lg border border-white/5 text-center">
          <div className="text-[10px] text-[#6B7280] font-bold uppercase">Down</div>
          <div className="text-sm font-bold font-mono text-[#22D3EE]">{telemetry?.network_io?.download_mbps?.toFixed(1) || 28.6}M</div>
        </div>
        <div className="bg-[#0B0F1A] p-2 rounded-lg border border-white/5 text-center">
          <div className="text-[10px] text-[#6B7280] font-bold uppercase">Up</div>
          <div className="text-sm font-bold font-mono text-[#10B981]">{telemetry?.network_io?.upload_mbps?.toFixed(1) || 7.8}M</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeInvestigation, setActiveInvestigation] = useState(null);
  const { data: socketStatus } = useAegisSocket('SIMULATION');
  const [simPhase, setSimPhase] = useState('idle'); // 'idle', 'attacking', 'mitigating', 'recovered'
  const [activeAttack, setActiveAttack] = useState(null);
  const sequenceRunning = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const isSimulationActive = socketStatus ? Object.values(socketStatus).some(s => s.status === 'running') : false;

  useEffect(() => {
    const triggeredViaNav = location.state?.simulationTriggered;
    const isActive = triggeredViaNav || isSimulationActive;

    if (isActive && !sequenceRunning.current) {
      sequenceRunning.current = true;
      setSimPhase('attacking');
      if (location.state?.attack) {
         setActiveAttack(location.state.attack);
      }
      
      // Phase 1: Attack lasts 5 seconds
      setTimeout(() => setSimPhase('mitigating'), 6000);
      
      // Phase 2: AI Mitigation lasts 4 seconds
      setTimeout(() => setSimPhase('recovered'), 10000);
      
      // Phase 3: Cleanup to idle
      setTimeout(() => {
        setSimPhase('idle');
        setActiveAttack(null);
        sequenceRunning.current = false;
      }, 13000);

      if (triggeredViaNav) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [isSimulationActive, location.state, navigate, location.pathname]);

  // Determine global dashboard classes based on the current sequence phase
  const containerClasses = [
    'max-w-[1900px] w-full mx-auto px-6 py-4 pb-24 transition-all duration-1000',
    simPhase === 'attacking' ? 'sim-mode-attacking bg-[#EF4444]/5 ring-1 ring-[#EF4444]/20' : '',
    simPhase === 'mitigating' ? 'sim-mode-mitigating bg-[#22D3EE]/5 ring-1 ring-[#22D3EE]/20' : '',
    simPhase === 'recovered' ? 'bg-[#10B981]/5 ring-1 ring-[#10B981]/20' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      
      {simPhase === 'attacking' && (
        <div className="fixed inset-0 pointer-events-none z-[100] border-[20px] border-[#EF4444]/10 animate-pulse shadow-[inset_0_0_100px_rgba(239,68,68,0.15)]" />
      )}
      
      {simPhase === 'mitigating' && (
        <>
          <div className="fixed inset-0 pointer-events-none z-[100] border-[10px] border-[#22D3EE]/30 animate-pulse shadow-[inset_0_0_80px_rgba(34,211,238,0.15)]" />
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-10 fade-in duration-500">
             <div className="flex items-center gap-4 bg-[#0B0F1A]/90 backdrop-blur-xl border border-[#22D3EE] p-4 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.3)]">
                <div className="w-12 h-12 rounded-full bg-[#22D3EE]/20 flex items-center justify-center border border-[#22D3EE]/50 animate-pulse">
                   <Bot className="w-6 h-6 text-[#22D3EE]" />
                </div>
                <div>
                   <div className="text-[10px] font-bold text-[#22D3EE] uppercase tracking-[0.2em] mb-1">Aegis Neural Commander</div>
                   <div className="text-sm font-black text-white font-mono">Executing Autonomous Remediation Script...</div>
                   <div className="text-xs text-[#9CA3AF] mt-1">Isolating compromised nodes • Deploying counter-measures</div>
                </div>
             </div>
          </div>
        </>
      )}

      {simPhase === 'recovered' && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-10 fade-in duration-500">
           <div className="flex items-center gap-4 bg-[#0B0F1A]/90 backdrop-blur-xl border border-[#10B981] p-4 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)]">
              <div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center border border-[#10B981]/50">
                 <ShieldCheck className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                 <div className="text-sm font-black text-white uppercase tracking-wider">Attack Successfully Neutralized</div>
                 <div className="text-xs text-[#10B981] font-mono mt-0.5">Systems nominal. Threat expelled.</div>
              </div>
           </div>
        </div>
      )}

      {/* ═══ ROW 1: GLOBAL AWARENESS ═══ */}
      <SectionDivider label="Global Situational Awareness" icon="🌐" />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 h-[400px]">
          <WorldMap simPhase={simPhase} activeAttack={activeAttack} />
        </div>
        <div className="col-span-4 h-[400px]">
          <SecurityScore simPhase={simPhase} activeAttack={activeAttack} />
        </div>
        <div className="col-span-4 flex flex-col gap-4">
          <div className="h-[260px]">
            <FleetHealthMatrix simPhase={simPhase} activeAttack={activeAttack} />
          </div>
          <ActiveTunnel />
        </div>
      </div>

      {/* ═══ ROW 2: COMMAND & INTELLIGENCE ═══ */}
      <SectionDivider label="Command & Intelligence" icon="🧠" />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          {activeInvestigation ? (
            <InvestigationPanel
              incident={activeInvestigation}
              onClose={() => setActiveInvestigation(null)}
            />
          ) : (
            <AIAdvisor onInvestigate={setActiveInvestigation} simPhase={simPhase} activeAttack={activeAttack} hero />
          )}
        </div>
        <div className="col-span-4 h-[650px]">
          <ChatPanel simPhase={simPhase} activeAttack={activeAttack} />
        </div>
      </div>

      {/* ═══ ROW 3: THREAT NARRATIVE & IO ═══ */}
      <SectionDivider label="Threat Narrative & IO Analytics" icon="⚠️" />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 h-[420px]">
          <AttackFlowStory simPhase={simPhase} activeAttack={activeAttack} />
        </div>
        <div className="col-span-5 h-[420px]">
          <TrafficGraph simPhase={simPhase} activeAttack={activeAttack} />
        </div>
      </div>

      {/* ═══ ROW 4: SIMULATION & IDENTITY ═══ */}
      <SectionDivider label="Simulation & Identity Matrix" icon="🔬" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-[400px]">
          <SimulationPanel simPhase={simPhase} activeAttack={activeAttack} />
        </div>
        <div className="h-[400px]">
          <KernelSimLog simPhase={simPhase} activeAttack={activeAttack} />
        </div>
        <div className="h-[400px]">
          <IdentityPanel simPhase={simPhase} activeAttack={activeAttack} />
        </div>
      </div>

      {/* ═══ ROW 5: LIVE SIGNALS & EXPOSURE ═══ */}
      <SectionDivider label="Live Signals & Exposure" icon="📡" />
      <div className="grid grid-cols-3 gap-4">
        <div className="card-glow h-[400px] flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse shadow-[0_0_6px_#22D3EE]" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">Telemetry Stream</span>
          </div>
          <div className="flex-1 min-h-0">
            <StreamingAuditLog simPhase={simPhase} activeAttack={activeAttack} />
          </div>
        </div>
        <div className="h-[400px]">
          <SecurityFeed simPhase={simPhase} activeAttack={activeAttack} />
        </div>
        <div className="h-[400px]">
          <ExposurePanel simPhase={simPhase} activeAttack={activeAttack} />
        </div>
      </div>

      {/* ═══ ROW 6: FORENSIC CHAIN ═══ */}
      <SectionDivider label="Forensic Evidence Chain" icon="🔗" />
      <div className="w-full">
        <ForensicTimeline simPhase={simPhase} activeAttack={activeAttack} />
      </div>

    </div>
  );
}
