import React from 'react';
import { Shield, Lock, Unlock, Server, AlertCircle } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';

export default function ExposurePanel({ simPhase, activeAttack }) {
  const { data: insights } = useAegisSocket('INSIGHTS');

  const observations = insights?.observations || [];
  
  const exposureSignal = observations.find(o => o.category === "SERVICE_EXPOSURE") || 
                         observations.find(o => o.raw_evidence?.open_ports?.length > 0);

  const baseOpenPorts = exposureSignal?.raw_evidence?.open_ports || [];
  const baseExposedServices = exposureSignal?.raw_evidence?.exposed_services || [];
  
  const isAttacking = simPhase === 'attacking';
  const openPorts = isAttacking ? [3389, 445, 22] : baseOpenPorts;
  const exposedServices = isAttacking ? ['RDP (Brute Force Target)', 'SMB (Vulnerable)', 'SSH (Key Leaked)'] : baseExposedServices;

  return (
        <div className="card-glow flex flex-col h-full bg-[#0B0F1A]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0B0F1A]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 flex items-center justify-center border border-[#22D3EE]/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                        <Shield className="w-5 h-5 text-[#22D3EE]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Exposure Analytics</h3>
                        <p className="text-xs text-[#9CA3AF] font-mono uppercase tracking-widest">Attack Surface</p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest font-mono border ${openPorts.length > 0 ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'}`}>
                    {openPorts.length > 0 ? 'SURFACE EXPOSED' : 'SURFACE SECURE'}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-[#0B0F1A]">
                <div className="p-4 rounded-xl bg-[#111827] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center border transition-all ${openPorts.length > 0 ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.15)]'}`}>
                            {openPorts.length > 0 ? <Unlock className="w-7 h-7 animate-pulse" /> : <Lock className="w-7 h-7" />}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white uppercase tracking-wider">{openPorts.length} Open Inbound Channels</div>
                            <div className="text-xs font-mono text-[#9CA3AF] mt-1 uppercase tracking-widest">Audit Scan: PCAP Inspection</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {exposedServices.length > 0 ? exposedServices.map((srv, i) => (
                        <div key={i} className="p-4 rounded-xl bg-[#111827] border border-white/10 flex items-center gap-4 transition-all hover:border-[#EF4444]/40">
                            <div className="w-10 h-10 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center">
                                <Server className="w-5 h-5 text-[#EF4444]" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate uppercase tracking-wider">{srv}</div>
                                <div className="text-xs font-mono text-[#EF4444] font-bold mt-0.5">PORT: {openPorts[i]}</div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-2 py-12 flex flex-col items-center justify-center opacity-50 gap-3 border border-dashed border-white/10 rounded-xl">
                            <Shield className="w-10 h-10 text-[#10B981]" />
                            <span className="text-sm font-bold uppercase tracking-widest font-mono text-[#9CA3AF]">No Risky Listeners</span>
                        </div>
                    )}
                </div>

                {openPorts.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#EF4444]"></div>
                        <div className="flex items-center gap-2 mb-2 text-[#EF4444]">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-widest font-mono">Remediation Protocol</span>
                        </div>
                        <p className="text-sm text-[#FCA5A5] leading-relaxed font-bold">
                            Management interfaces (SSH/RDP) are exposed to public ingress. Recommend immediate isolation or whitelist-governed policy deployment.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
