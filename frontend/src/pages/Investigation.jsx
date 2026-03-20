import { useState } from 'react';
import { Search, MapPin, Globe, Shield, Activity, Clock, ChevronRight, FileText } from 'lucide-react';
import { useAegisSocket } from '../services/useAegisSocket';
import { getSeverityColor, timeAgo } from '../utils/helpers';
import SecurityGraph from '../components/dashboard/SecurityGraph';

export default function Investigation() {
  const [selectedThreat, setSelectedThreat] = useState(null);
  const { data: liveThreats } = useAegisSocket('THREATS');
  const threats = liveThreats ? liveThreats.slice(0, 50) : undefined;

  const activeThreats = (threats || []).filter(t => t.status === 'active');

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold font-[var(--font-display)] tracking-tight">Incident Investigation</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Deep forensic analysis of detected behavioral anomalies and persistent threats.</p>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
         {/* Incident List */}
         <div className="col-span-4 card-glow flex flex-col min-h-0">
            <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] flex items-center justify-between">
               <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">Incident Queue</h3>
               <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] font-bold">{threats?.length || 0} Tickets</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
               {threats?.length === 0 ? (
                 <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">No incidents in the queue.</div>
               ) : (
                 (threats || []).map((t) => (
                   <button
                     key={t.id}
                     onClick={() => setSelectedThreat(t)}
                     className={`w-full text-left p-3 rounded-lg border transition-all ${
                       selectedThreat?.id === t.id 
                       ? 'bg-[var(--color-bg-elevated)] border-[var(--color-accent)]' 
                       : 'bg-transparent border-transparent hover:bg-white/5'
                     } ${t.status === 'mitigated' ? 'opacity-60' : ''}`}
                   >
                     <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold truncate pr-2 flex items-center gap-2">
                            {t.status === 'mitigated' && <Shield className="w-3 h-3 text-emerald-400" />}
                            {t.status === 'active' && <Activity className="w-3 h-3 text-red-500 animate-pulse" />}
                            {t.explanation || t.threat_type}
                        </span>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.status === 'mitigated' ? '#10b981' : getSeverityColor(t.severity) }} />
                     </div>
                     <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                        <span className="font-mono">{t.source_ip}</span>
                        <span>{timeAgo(t.timestamp)}</span>
                     </div>
                   </button>
                 ))
               )}
            </div>
         </div>

         {/* Investigation Workspace */}
         <div className="col-span-8 space-y-6">
            {selectedThreat ? (
               <div className="h-full flex flex-col gap-6">
                  {/* Forensic Header */}
                  <div className="card-glow p-6 bg-gradient-to-br from-[var(--color-bg-card)] to-black/40">
                     <div className="flex items-start justify-between">
                        <div className="space-y-1">
                           <div className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-[0.2em] mb-2">Forensic Report #{selectedThreat.id.slice(0, 8)}</div>
                           <h3 className="text-2xl font-bold">{selectedThreat.explanation || selectedThreat.threat_type}</h3>
                           <div className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                                 <MapPin className="w-3.5 h-3.5 text-red-400" /> {selectedThreat.geo || 'Unknown Location'}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                                 <Clock className="w-3.5 h-3.5 text-blue-400" /> Detected {timeAgo(selectedThreat.timestamp)}
                              </span>
                           </div>
                        </div>
                        <div className="flex flex-col gap-3 items-end">
                           <div 
                             className="px-4 py-2 rounded-xl text-lg font-bold font-[var(--font-mono)] text-center"
                             style={{ color: getSeverityColor(selectedThreat.severity), backgroundColor: `${getSeverityColor(selectedThreat.severity)}15`, border: `1px solid ${getSeverityColor(selectedThreat.severity)}30` }}
                           >
                              {selectedThreat.severity.toUpperCase()}
                           </div>
                           <button 
                              onClick={() => window.open(`/api/report/generate/${selectedThreat.id}?token=${localStorage.getItem('aegis_token')}`, '_blank')}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#00E5FF] transition-all"
                           >
                              <FileText className="w-3.5 h-3.5" />
                              Generate Briefing
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Deep Details */}
                  <div className="grid grid-cols-2 gap-6">
                     <div className="card-glow p-5 flex flex-col gap-4">
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">AI Evidence Chain</h4>
                        <div className="space-y-3">
                           {selectedThreat.indicators?.map((ind, i) => (
                             <div key={i} className="flex gap-3 text-xs bg-[var(--color-bg-panel)] p-3 rounded-lg border border-[var(--color-border-subtle)] slide-in" style={{ animationDelay: `${i * 100}ms` }}>
                               <Shield className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                               <span className="text-[var(--color-text-secondary)] leading-relaxed">{ind}</span>
                             </div>
                           )) || <div className="text-xs text-[var(--color-text-muted)] italic">No detailed indicators provided.</div>}
                        </div>
                     </div>

                     <div className="card-glow p-5 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">Asset Correlation</h4>
                        <div className="space-y-4">
                           <AssetItem label="Source Vector" value={selectedThreat.source_ip} sub="Public Endpoint" />
                           <AssetItem label="Target Identity" value={selectedThreat.target_user || 'UNBOUND'} sub="Domain Resource" />
                           <AssetItem label="Confidence Level" value={`${selectedThreat.confidence.toFixed(1)}%`} sub="Classifier Accuracy" />
                           <AssetItem label="Anomaly Score" value={selectedThreat.anomaly_score.toFixed(4)} sub="Statistical Variance" />
                        </div>
                     </div>
                  </div>
                  
                  {/* Embedded Lateral Movement Graph */}
                  <div className="flex-1 min-h-[400px] card-glow flex flex-col overflow-hidden relative border border-[var(--color-border-subtle)]">
                      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Lateral Movement Topology
                      </div>
                      <div className="flex-1">
                          <SecurityGraph />
                      </div>
                  </div>
               </div>
            ) : (
               <div className="card-glow h-full flex flex-col items-center justify-center text-center gap-6 p-12 opacity-50">
                  <div className="w-20 h-20 rounded-full border border-dashed border-gray-600 flex items-center justify-center">
                     <Search className="w-10 h-10 text-gray-600" />
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-lg font-bold">No Incident Selected</h4>
                     <p className="text-sm text-[var(--color-text-muted)] max-w-sm">Select an active incident from the left-hand panel to begin deep forensic investigation.</p>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

function AssetItem({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-[var(--color-border-subtle)]">
       <div className="space-y-0.5">
          <div className="text-[9px] uppercase text-[var(--color-text-muted)] tracking-widest">{label}</div>
          <div className="text-xs font-bold text-[var(--color-text-primary)]">{value}</div>
       </div>
       <div className="text-[9px] text-[var(--color-accent)] uppercase font-mono">{sub}</div>
    </div>
  );
}
