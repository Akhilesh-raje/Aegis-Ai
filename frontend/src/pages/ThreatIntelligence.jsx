import { Shield, Target, Database, Globe, ChevronRight, Search } from 'lucide-react';
import { useAegisSocket } from '../services/useAegisSocket';
import { getSeverityColor } from '../utils/helpers';
import MitreHeatmap from '../components/dashboard/MitreHeatmap';

export default function ThreatIntelligence() {
  const { data: liveThreats } = useAegisSocket('THREATS');
  const allThreats = liveThreats ?? [];
  const threats = allThreats.slice(0, 100);

  const threatTypes = [
    { name: 'Credential Access', count: (threats || []).filter(t => t.mitre_tactic === 'Credential Access').length, icon: Shield },
    { name: 'Impact', count: (threats || []).filter(t => t.mitre_tactic === 'Impact').length, icon: Target },
    { name: 'Discovery', count: (threats || []).filter(t => t.mitre_tactic === 'Discovery').length, icon: Search },
    { name: 'Exfiltration', count: (threats || []).filter(t => t.mitre_tactic === 'Exfiltration').length, icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold font-[var(--font-display)] tracking-tight">Threat Intelligence</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Global threat landscape analysis and behavioral signatures.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {threatTypes.map((type) => (
          <div key={type.name} className="card-glow p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <type.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase text-[var(--color-text-muted)] tracking-wider">{type.name}</div>
              <div className="text-xl font-bold">{type.count} Observed</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="h-[500px]">
           <MitreHeatmap threats={allThreats || []} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card-glow flex flex-col min-h-0">
          <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">Historical Intelligence Feed</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-2">
            {(threats || []).map((t, i) => (
              <div key={t.id} className="p-3 rounded-lg bg-[var(--color-bg-panel)] border border-[var(--color-border-subtle)] flex items-center justify-between group hover:border-[var(--color-accent)]/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSeverityColor(t.severity) }} />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold">{t.explanation || t.threat_type}</div>
                    <div className="text-[10px] font-mono text-[var(--color-text-muted)]">{t.source_ip} | {t.mitre_id || 'NO_MITRE'}</div>
                  </div>
                </div>
                <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-4 h-4 text-[var(--color-accent)]" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 space-y-6">
           <div className="card-glow p-5 space-y-4">
             <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">Active Geo Vectors</h3>
             <div className="space-y-3">
               <GeoItem name="Russia" severity="high" count={8} />
               <GeoItem name="China" severity="critical" count={12} />
               <GeoItem name="Nigeria" severity="medium" count={4} />
               <GeoItem name="United States" severity="low" count={45} />
             </div>
           </div>

           <div className="card-glow p-5 flex flex-col items-center justify-center text-center gap-4 py-8">
              <Globe className="w-12 h-12 text-[var(--color-accent)] animate-pulse-slow" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Threat Cloud Sync</h4>
                <p className="text-[10px] text-[var(--color-text-muted)]">AegisAI is synchronized with global threat repositories for zero-day signature matching.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function GeoItem({ name, severity, count }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--color-text-secondary)]">{name}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[var(--color-text-muted)]">{count}</span>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSeverityColor(severity) }} />
      </div>
    </div>
  );
}
