import { Shield, AlertTriangle } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';
import { useAnimatedValue } from '../../utils/helpers';

export default function SecurityScore({ simPhase, activeAttack }) {
  const { data: insights } = useAegisSocket('INSIGHTS');
  const { data: socketStatus } = useAegisSocket('SIMULATION');

  const isSimulationActive = simPhase === 'attacking';

  // Score drops during active attack, recovers after
  const baseScore = insights?.score?.total ?? 82;
  const score = isSimulationActive ? Math.max(12, baseScore - 55) : baseScore;
  const animated = useAnimatedValue(score, 1200);
  const verdict = isSimulationActive ? 'UNDER ATTACK' : (insights?.verdict || 'VULNERABLE');

  const getColor = (s) => {
    if (s >= 85) return '#22c55e';
    if (s >= 60) return '#f59e0b';
    if (s >= 30) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(score);
  
  // Semi-circle (180 degrees)
  const radius = 42;
  const circumference = Math.PI * radius;
  const dashoffset = circumference - (animated / 100) * circumference;

  return (
    <div className={`card-glow p-6 flex flex-col gap-5 h-full transition-all duration-1000 ${isSimulationActive ? 'ring-2 ring-[#EF4444]/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : ''}`}>
      <div className="flex items-center justify-between">
         <h3 className="text-sm font-bold text-white uppercase tracking-wider">System Security Score</h3>
         {isSimulationActive ? (
           <AlertTriangle className="w-5 h-5 text-[#EF4444] animate-pulse" />
         ) : (
           <Shield className="w-5 h-5 text-[#22D3EE]" />
         )}
      </div>

      {/* Semi-circular Gauge */}
      <div className="relative flex flex-col items-center">
        <div className="relative w-48 h-24 overflow-hidden">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            <path
              d="M 10 45 A 40 40 0 0 1 90 45"
              fill="none"
              stroke="var(--color-border-subtle)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 10 45 A 40 40 0 0 1 90 45"
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={dashoffset}
              style={{
                transition: 'stroke-dashoffset 1.5s ease-out',
                filter: `drop-shadow(0 0 8px ${color}60)`,
              }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
              <div className={`text-4xl font-black tracking-tighter ${isSimulationActive ? 'animate-pulse' : ''}`} style={{ color, textShadow: `0 0 20px ${color}40` }}>
                {Math.round(animated)}
             </div>
             <div className="text-xs text-[#9CA3AF] mt-1 font-mono font-bold">SECURITY SCORE</div>
          </div>
        </div>

        <span
          className={`mt-4 text-[10px] font-black tracking-[0.2em] px-4 py-1.5 rounded-sm uppercase flex items-center gap-2 transition-all duration-500`}
          style={{
            color,
            backgroundColor: `${color}15`,
            border: `1px solid ${color}30`,
            boxShadow: `0 0 15px ${color}20`
          }}
        >
          {isSimulationActive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
          {verdict === 'VULNERABLE' ? <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> : null}
          {verdict}
        </span>
      </div>

      {/* Elite Metrics Density */}
      <div className="space-y-3 pt-4 border-t border-white/10">
         <ScoreMetric label="Network" val={isSimulationActive ? 4 : (insights?.score?.breakdown?.Network || 0)} max={20} color={isSimulationActive ? '#ef4444' : '#f97316'} trend={isSimulationActive ? 'down' : 'up'} />
         <ScoreMetric label="System" val={isSimulationActive ? 6 : (insights?.score?.breakdown?.System || 0)} max={20} color={isSimulationActive ? '#ef4444' : '#f59e0b'} trend={isSimulationActive ? 'down' : 'none'} />
         <ScoreMetric label="Threats" val={isSimulationActive ? 2 : (insights?.score?.breakdown?.Threats || 0)} max={20} color="#ef4444" trend="down" />
         <ScoreMetric label="Software" val={insights?.score?.breakdown?.Software || 0} max={20} color="#22c55e" trend="up" />
         <ScoreMetric label="Firewall" val={isSimulationActive ? 3 : (insights?.score?.breakdown?.Firewall || 0)} max={20} color="#ef4444" trend="down" />
      </div>
    </div>
  );
}

function ScoreMetric({ label, val, max, color, trend }) {
  const pct = (val / max) * 100;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-16 text-[#9CA3AF] font-bold uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-2 bg-[#0B0F1A] rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full rounded-full transition-all duration-1000" 
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} 
        />
      </div>
      <div className="w-10 flex items-center justify-end gap-1 font-mono font-bold text-xs">
         {trend === 'up' && <span className="text-[#10B981]">▲</span>}
         {trend === 'down' && <span className="text-[#EF4444]">▼</span>}
         {trend === 'none' && <span className="text-[#6B7280]">-</span>}
         <span style={{ color }}>{val}</span>
      </div>
    </div>
  );
}

