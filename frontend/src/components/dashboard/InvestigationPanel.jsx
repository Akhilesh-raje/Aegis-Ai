import React from 'react';
import { X, Shield, Terminal, Cpu, Globe, Activity, Search, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export default function InvestigationPanel({ incident, onClose }) {
  if (!incident) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[550px] bg-[#050b18]/95 backdrop-blur-3xl border-l border-white/10 z-[100] shadow-[-30px_0_100px_rgba(0,0,0,0.9)] animate-in slide-in-from-right duration-500 flex flex-col group">
       {/* High-Authority Header */}
       <div className="p-8 border-b border-white/5 bg-black/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
          <div className="flex items-center justify-between mb-8 relative z-10">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)] transition-transform group-hover:scale-105">
                   <Shield className="w-7 h-7 text-red-400" />
                </div>
                <div>
                   <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)] font-mono">Forensic_Audit_Module_v7.0</h2>
                   <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px] font-black text-gray-600 uppercase">
                     <span>ID_TOKEN: {incident.id?.slice(0, 16) || "AUDIT_MANUAL_v01"}</span>
                     <span className="opacity-20">|</span>
                     <span className="text-red-400/60">PRORITY: CRITICAL</span>
                   </div>
                </div>
             </div>
             <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-sm bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
             </button>
          </div>
          
          <div className="p-5 rounded bg-red-500/5 border border-red-500/10 flex items-center gap-5 relative group/alert">
             <div className="absolute left-0 top-0 w-1 h-full bg-red-500/40"></div>
             <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
             <div>
                <div className="text-[10px] font-black font-mono text-red-300 uppercase tracking-widest mb-1">Alert_Description:</div>
                <div className="text-sm font-black text-red-100 uppercase tracking-tight">{incident.title || "ANOMALOUS_BEHAVIOR_DETECTED"}</div>
             </div>
          </div>
       </div>

       {/* Evidence Scrollspace */}
       <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-black/20">
          
          {/* AI Forensic Logic */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 font-mono">
                <Search className="w-3.5 h-3.5" /> Logical_Interpretation
             </div>
             <div className="p-6 rounded bg-black/40 border border-white/5 relative overflow-hidden group/card hover:border-cyan-500/20 transition-colors">
                <div className="text-[13px] leading-relaxed text-gray-400 italic font-medium">
                   "Heuristic analysis classifies this vector as 88% representative of a lateral movement phase. Pattern matching indicates standard credential harvesting techniques targeting local registry hives and LSASS process memory."
                </div>
                <div className="mt-6 pt-5 border-t border-white/5 space-y-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-sm bg-cyan-400"></span>
                       <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest font-mono">CONFIDENCE_STIRM: {incident.confidence || 88}%</span>
                     </div>
                     <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter font-mono opacity-60">KERNEL_SVC_V4.2</span>
                   </div>
                   <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 transition-all duration-1000"
                        style={{ width: `${incident.confidence || 88}%` }}
                      ></div>
                   </div>
                </div>
             </div>
          </section>

          {/* Telemetry Clusters */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 font-mono">
                <Activity className="w-3.5 h-3.5" /> Sensor_Trace_Logs
             </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 rounded bg-black/40 border border-white/5 hover:bg-white/[0.02] transition-colors relative group/tile">
                    <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 font-mono">Target_Asset</span>
                       </div>
                       <TrendingUp className="w-2.5 h-2.5 text-red-400 transition-transform group-hover/tile:scale-125" />
                    </div>
                    <div className="text-xs font-black text-gray-300 uppercase font-mono tracking-widest">NODE_ALPHA_01</div>
                 </div>
                 <div className="p-5 rounded bg-black/40 border border-white/5 hover:bg-white/[0.02] transition-colors relative group/tile">
                    <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 font-mono">Ingress_Origin</span>
                       </div>
                       <TrendingDown className="w-2.5 h-2.5 text-emerald-400 transition-transform group-hover/tile:scale-125" />
                    </div>
                    <div className="text-xs font-black text-gray-300 font-mono tracking-tighter">{incident.source_ip || "185.22.44.91"}</div>
                 </div>
              </div>
             
             <div className="p-5 rounded bg-black/40 border border-white/5">
                <div className="flex items-center justify-between mb-5">
                   <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 font-mono">Process_Visual_Context</span>
                   </div>
                   <span className="text-[8px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">VERIFIED_SIGNATURE</span>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[10px] text-gray-500 font-bold uppercase font-mono">Parent_Process:</span>
                      <span className="text-[10px] font-mono font-black text-gray-300">EXPLORER.EXE [3244]</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase font-mono">Execution_Target:</span>
                      <span className="text-[10px] font-mono font-black text-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.1)]">PYTHON.EXE [8821]</span>
                   </div>
                </div>
             </div>
          </section>

          {/* Remediation Protocols */}
          <section className="space-y-4">
             <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 font-mono">Automated_Remediation_Options</div>
             <div className="space-y-3">
                {["Isolate_Process_ID_8821", "Null_Route_Source_IP_185.22.44.91", "Nullify_User_Session_Keys"].map((rec, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded bg-black/60 border border-white/5 hover:border-emerald-500/30 transition-all group/rec">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover/rec:bg-emerald-500 transition-colors"></div>
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest font-mono group-hover/rec:text-emerald-400">{rec}</span>
                      </div>
                      <button className="px-4 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/rec:opacity-100 transition-all border border-emerald-500/20">
                         EXEC_CMD
                      </button>
                   </div>
                ))}
             </div>
          </section>
       </div>

       {/* Operational Action Block */}
       <div className="p-8 border-t border-white/5 bg-black/60">
          <button className="w-full py-4 rounded bg-red-600 text-white text-[12px] font-black uppercase tracking-[0.3em] shadow-[0_10_40px_rgba(220,38,38,0.2)] hover:bg-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] active:scale-[0.98] transition-all font-mono">
             [ !! INITIALIZE_LOCKDOWN_PROTOCOL !! ]
          </button>
       </div>
    </div>
  );
}
