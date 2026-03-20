import { Activity, ShieldCheck, AlertTriangle, CheckCircle, Gauge, TrendingUp } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';
import { useAnimatedValue, formatNumber } from '../../utils/helpers';

function StatCard({ title, value, icon: Icon, color, suffix = '', trend = '+16.5%' }) {
  const animated = useAnimatedValue(value || 0);
  return (
    <div className="card-glow p-5 flex flex-col gap-3 group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest group-hover:text-[var(--color-text-primary)] transition-colors">
          {title}
        </span>
        <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
            <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      
      <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold font-[var(--font-mono)] text-[var(--color-text-primary)] count-animate tracking-tighter">
              {Number.isInteger(value) ? Math.round(animated).toLocaleString() : animated.toFixed(1)}
            </span>
            {suffix && <span className="text-xs font-bold text-[var(--color-text-muted)] opacity-50 uppercase">{suffix}</span>}
          </div>
          
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-success)]/10 text-[var(--color-success)] text-[9px] font-bold border border-[var(--color-success)]/20">
                <TrendingUp className="w-2.5 h-2.5" /> {trend}
             </div>
             {/* Mini sparkline placeholder */}
             <div className="w-16 h-4 opacity-30">
                <svg viewBox="0 0 64 16" className="w-full h-full">
                    <path d="M0 12 L12 8 L24 10 L36 4 L48 6 L64 0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
                </svg>
             </div>
          </div>
      </div>
    </div>
  );
}

export default function StatsCards() {
  const { data: stats } = useAegisSocket('STATS');

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        title="Events Processed"
        value={stats?.total_events || 0}
        icon={Activity}
        color="#00e5ff"
        trend="+12.4%"
      />
      <StatCard
        title="Events / sec"
        value={stats?.event_rate || 0}
        icon={Gauge}
        color="#3b82f6"
        suffix="/s"
        trend="+18.2%"
      />
      <StatCard
        title="Active Incidents"
        value={stats?.active_threats || 0}
        icon={AlertTriangle}
        color="#f59e0b"
        trend="+5.3%"
      />
      <StatCard
        title="Mitigated Threats"
        value={stats?.mitigated_threats || 0}
        icon={CheckCircle}
        color="#22c55e"
        trend="+24.1%"
      />
    </div>
  );
}
