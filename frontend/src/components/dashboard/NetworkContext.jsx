import { Globe, MapPin, Wifi, WifiOff } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';

export default function NetworkContext() {
  const { data } = useAegisSocket('TELEMETRY');

  const ctx = data?.context || {};
  const net = data?.network_io || {};

  return (
    <div className="card-glow p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-[var(--color-accent)]" />
        <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          Network Context
        </h3>
      </div>

      <div className="space-y-3">
        <InfoRow label="Public IP" value={ctx.public_ip || '—'} accent />
        <InfoRow label="ISP" value={ctx.isp || '—'} />
        <InfoRow label="Location" value={ctx.location || '—'} />

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--color-text-muted)] w-24">VPN</span>
          {ctx.vpn_active ? (
            <span className="flex items-center gap-1 text-[var(--color-success)]">
              <Wifi className="w-3 h-3" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[var(--color-warning)]">
              <WifiOff className="w-3 h-3" /> Not Active
            </span>
          )}
        </div>

        <div className="h-px bg-[var(--color-border-subtle)] my-2" />

        <InfoRow label="Download" value={`${(net.download_mbps || 0).toFixed(1)} Mbps`} />
        <InfoRow label="Upload" value={`${(net.upload_mbps || 0).toFixed(1)} Mbps`} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[var(--color-text-muted)] w-24">{label}</span>
      <span className={accent ? 'text-[var(--color-accent)] font-mono' : 'text-[var(--color-text-secondary)]'}>
        {value}
      </span>
    </div>
  );
}
