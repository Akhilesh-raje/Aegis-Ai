import { Network, Server, Shield, Globe, Cpu, Activity, Zap, ShieldAlert, Wifi, Globe2 } from 'lucide-react';
import TrafficGraph from '../components/dashboard/TrafficGraph';
import NetworkContext from '../components/dashboard/NetworkContext';
import { useAegisSocket } from '../services/useAegisSocket';

export default function NetworkMonitor() {
  const { data: stats } = useAegisSocket('STATS');

  const isUnderAttack = stats?.active_threats > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
         <div className="flex items-center gap-2 text-[var(--color-accent)] mb-1">
            <Network className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Traffic Intelligence</span>
         </div>
        <h2 className="text-3xl font-bold font-[var(--font-display)] tracking-tight">Infrastructure Topology</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">Visualizing logical data flow across internal and perimeter assets with real-time threat-vector mapping.</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Dynamic Topology View */}
        <div className="col-span-9 glass-panel p-10 flex flex-col gap-6 relative overflow-hidden bg-black/40">
           {/* Top Info Bar */}
           <div className="flex items-center justify-between relative z-10 px-2">
              <div className="flex items-center gap-8">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Topology Mode</span>
                    <span className="text-xs font-bold text-[var(--color-accent)]">LOGICAL_HIERARCHY</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Assets</span>
                    <span className="text-xs font-bold text-white">4 INFRA_NODES</span>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Gateway_UP</span>
                 </div>
              </div>
           </div>

           {/* The Map */}
           <div className="flex-1 relative flex items-center justify-center min-h-[450px] z-10">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 400">
                 {/* Connection Paths */}
                 <defs>
                   <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="transparent" />
                     <stop offset="50%" stopColor="var(--color-accent)" stopOpacity="0.3" />
                     <stop offset="100%" stopColor="transparent" />
                   </linearGradient>
                   <filter id="glow">
                     <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                     <feMerge>
                       <feMergeNode in="coloredBlur"/>
                       <feMergeNode in="SourceGraphic"/>
                     </feMerge>
                   </filter>
                 </defs>

                 {/* Internet to Firewall */}
                 <path d="M 150 200 L 350 150" stroke="#ffffff10" strokeWidth="1" fill="none" />
                 <path 
                    d="M 150 200 L 350 150" 
                    stroke="var(--color-accent)" 
                    strokeWidth="2" 
                    fill="none" 
                    className="animate-draw" 
                    strokeDasharray="10 20"
                    opacity={isUnderAttack ? 1 : 0.2}
                    filter="url(#glow)"
                 />

                 {/* Internet to Load Balancer */}
                 <path d="M 150 200 L 350 250" stroke="#ffffff10" strokeWidth="1" fill="none" />
                 <path 
                    d="M 150 200 L 350 250" 
                    stroke="var(--color-accent)" 
                    strokeWidth="2" 
                    fill="none" 
                    className="animate-draw-reverse" 
                    strokeDasharray="10 20"
                    opacity="0.2"
                 />

                 {/* Security Cluster to Local Core */}
                 <path d="M 350 150 L 600 200" stroke="#ffffff10" strokeWidth="1" fill="none" />
                 <path d="M 350 250 L 600 200" stroke="#ffffff10" strokeWidth="1" fill="none" />
                 <path 
                    d="M 400 200 L 600 200" 
                    stroke={isUnderAttack ? 'var(--color-danger)' : 'var(--color-success)'} 
                    strokeWidth="1.5" 
                    fill="none" 
                    className="animate-pulse" 
                    opacity="0.3"
                 />
              </svg>

              <div className="flex items-center justify-around w-full relative">
                 {/* Perimeter Layer */}
                 <div className="flex flex-col gap-4 items-center">
                   <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-4">Northbound</div>
                   <TopoNode icon={Globe2} label="Global WAN" ip="8.8.8.8" status="Nominal" />
                 </div>

                 {/* Security Layer */}
                 <div className="flex flex-col gap-12 items-center">
                   <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-[-20px]">Security Cluster</div>
                   <TopoNode 
                     icon={Shield} 
                     label="Perimeter FW" 
                     ip="172.16.0.1" 
                     status={isUnderAttack ? 'Alert' : 'Secure'} 
                     severity={isUnderAttack ? 'critical' : 'success'}
                     active={isUnderAttack}
                   />
                   <TopoNode icon={Server} label="Sync LB" ip="172.16.0.4" status="Nominal" />
                 </div>

                 {/* Core Layer */}
                 <div className="flex flex-col gap-4 items-center">
                   <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-4">Southbound</div>
                   <TopoNode icon={Cpu} label="Core_VLAN_10" ip="10.0.10.x" status="Monitoring" severity="info" primary />
                 </div>
              </div>
           </div>

           {/* Metrics Footer */}
           <div className="mt-auto grid grid-cols-4 gap-8 pt-6 border-t border-white/5 relative z-10">
              <TopoMetric icon={Wifi} label="Perimeter Bandwidth" value="1.2 Gbps" status="Optimal" />
              <TopoMetric icon={Activity} label="Dropped Requests" value={isUnderAttack ? "2.4k/s" : "0"} status={isUnderAttack ? "Filtering" : "Nominal"} warning={isUnderAttack} />
              <TopoMetric icon={ShieldAlert} label="WAF Inspections" value="14,240/m" status="Active" />
              <TopoMetric icon={Zap} label="Tunnel Latency" value="0.8ms" status="Excellent" />
           </div>

           {/* Backdrop elements */}
           <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--color-accent)]/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4" />
           </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="col-span-3 space-y-6">
           <NetworkContext />
           <TrafficGraph />
           <div className="glass-panel p-5 space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-white/5 pb-3">Protocol Analytics</h3>
              <div className="space-y-3">
                 <div className="flex justify-between items-center bg-black/20 p-2 rounded border border-white/5">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">HTTPS (443)</span>
                    <span className="text-[10px] font-bold text-[var(--color-accent)]">84%</span>
                 </div>
                 <div className="flex justify-between items-center bg-black/20 p-2 rounded border border-white/5">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">SSH (22)</span>
                    <span className="text-[10px] font-bold text-gray-200">12%</span>
                 </div>
                 <div className="flex justify-between items-center bg-black/20 p-2 rounded border border-white/5">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">OTHER</span>
                    <span className="text-[10px] font-bold text-gray-600">4%</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function TopoNode({ icon: Icon, label, ip, status, severity = 'accent', active, primary }) {
  const getGlowColor = () => {
    if (severity === 'critical') return 'rgba(239, 68, 68, 0.4)';
    if (severity === 'success') return 'rgba(34, 197, 94, 0.4)';
    if (primary) return 'rgba(0, 229, 255, 0.4)';
    return 'rgba(255, 255, 255, 0.1)';
  };

  const getBorderColor = () => {
    if (severity === 'critical') return 'border-red-500/50';
    if (severity === 'success') return 'border-green-500/50';
    if (primary) return 'border-[var(--color-accent)]';
    return 'border-white/10';
  };

  const getIconColor = () => {
    if (severity === 'critical') return 'text-red-400';
    if (severity === 'success') return 'text-green-400';
    if (primary) return 'text-[var(--color-accent)]';
    return 'text-gray-400';
  };

  return (
    <div className={`flex flex-col items-center gap-4 group transition-all duration-500 cursor-pointer ${active ? 'scale-110' : 'hover:scale-105'}`}>
      <div 
        className={`w-20 h-20 rounded-[28%] flex items-center justify-center transition-all bg-black/60 border-2 ${getBorderColor()} relative overflow-hidden`}
        style={{ boxShadow: `0 0 40px ${getGlowColor()}` }}
      >
        <Icon className={`w-9 h-9 relative z-10 transition-colors ${getIconColor()}`} />
        {active && (
           <div className="absolute inset-0 bg-red-600/10 animate-pulse border-2 border-red-500/60 rounded-[28%]" />
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5">
         <span className={`text-[11px] font-black uppercase tracking-wider ${primary ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>{label}</span>
         <span className="text-[9px] font-mono text-gray-500">{ip}</span>
         <div className="mt-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
            <span className={`text-[8px] font-black uppercase font-mono ${severity === 'critical' ? 'text-red-400' : severity === 'success' ? 'text-green-400' : 'text-gray-500'}`}>{status}</span>
         </div>
      </div>
    </div>
  );
}

function TopoMetric({ icon: Icon, label, value, status, warning }) {
  return (
    <div className="flex items-start gap-3">
       <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${warning ? 'text-red-400' : 'text-[var(--color-accent)]'}`}>
          <Icon className="w-4 h-4" />
       </div>
       <div className="space-y-0.5">
          <div className="text-[9px] uppercase text-gray-600 tracking-widest font-black leading-tight">{label}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[var(--color-text-primary)] tracking-tight">{value}</span>
            <span className={`text-[8px] font-black uppercase tracking-tighter ${warning ? 'text-red-400 animate-pulse' : 'text-green-500 opacity-60'}`}>{status}</span>
          </div>
       </div>
    </div>
  );
}
