import { Cpu, MemoryStick, Wifi } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';
import { useAnimatedValue } from '../../utils/helpers';

function RadialGauge({ label, value, icon: Icon, color, max = 100, unit = '%' }) {
  const animated = useAnimatedValue(value || 0, 1000);
  const pct = Math.min((animated / max) * 100, 100);
  const circumference = 2 * Math.PI * 35;
  const dashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="35" fill="none" stroke="var(--color-border-subtle)" strokeWidth="5" />
          <circle
            cx="40" cy="40" r="35"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{
              transition: 'stroke-dashoffset 0.8s ease-out',
              filter: `drop-shadow(0 0 6px ${color}50)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
          <Icon className="w-3.5 h-3.5 mb-0.5" style={{ color }} />
          <span className="text-lg font-bold" style={{ color }}>
            {animated.toFixed(0)}
          </span>
          <span className="text-[9px] text-[var(--color-text-muted)]">{unit}</span>
        </div>
      </div>
      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
    </div>
  );
}

export default function SystemHealth() {
  const { data } = useAegisSocket('TELEMETRY');

  const sys = data?.system || {};
  const net = data?.network_io || {};

  const cpuColor = sys.cpu_usage > 80 ? '#ef4444' : sys.cpu_usage > 50 ? '#f59e0b' : '#22c55e';
  const ramColor = sys.ram_usage > 85 ? '#ef4444' : sys.ram_usage > 60 ? '#f59e0b' : '#22c55e';

  return (
    <div className="card-glow p-5">
      <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
        System Health
      </h3>
      <div className="flex justify-around">
        <RadialGauge label="CPU" value={sys.cpu_usage || 0} icon={Cpu} color={cpuColor} />
        <RadialGauge label="RAM" value={sys.ram_usage || 0} icon={MemoryStick} color={ramColor} />
        <RadialGauge
          label="Network"
          value={(net.download_mbps || 0) + (net.upload_mbps || 0)}
          icon={Wifi}
          color="var(--color-accent)"
          max={100}
          unit="Mbps"
        />
      </div>
    </div>
  );
}
