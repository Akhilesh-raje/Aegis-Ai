import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Cpu, Wifi, HardDrive, Shield } from 'lucide-react';
import socketManager from '../../services/useAegisSocket';

export default function KernelSimLog({ simPhase, activeAttack }) {
  const [logs, setLogs] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const unsub = socketManager.subscribe('TELEMETRY', (data) => {
      if (!data) return;
      const now = Date.now();
      const newLogs = [];

      const procs = data.processes || [];
      if (procs.length > 0) {
        const top = procs[0];
        newLogs.push({
          id: `proc-${now}`,
          ts: now,
          level: top.cpu > 50 ? 'WARN' : 'INFO',
          source: 'PROC',
          message: `PID ${top.pid} [${top.name}] CPU=${top.cpu}% MEM=${top.memory}%`,
          icon: 'cpu'
        });
      }

      const conns = data.connections?.active_connections || [];
      if (conns.length > 0) {
        const c = conns[conns.length - 1];
        newLogs.push({
          id: `net-${now}`,
          ts: now,
          level: c.status === 'ESTABLISHED' ? 'INFO' : 'WARN',
          source: 'NET',
          message: `${c.status} ${c.local_address}:${c.local_port} → ${c.remote_address}:${c.remote_port}`,
          icon: 'net'
        });
      }

      const disk = data.system?.disk_usage;
      if (disk !== undefined) {
        newLogs.push({
          id: `disk-${now}`,
          ts: now,
          level: disk > 85 ? 'CRIT' : disk > 70 ? 'WARN' : 'INFO',
          source: 'DISK',
          message: `Filesystem at ${disk}% — ${disk > 85 ? 'THRESHOLD EXCEEDED' : 'nominal'}`,
          icon: 'disk'
        });
      }

      const osLogs = data.os_logs || [];
      osLogs.slice(0, 2).forEach((log, i) => {
        newLogs.push({
          id: `os-${now}-${i}`,
          ts: now,
          level: log.level === 'Error' ? 'CRIT' : log.level === 'Warning' ? 'WARN' : 'INFO',
          source: 'KERN',
          message: `[${log.source || 'System'}] ${log.message?.slice(0, 100) || 'Event'}`,
          icon: 'shield'
        });
      });

      if (newLogs.length > 0 && simPhase !== 'attacking') {
        setLogs(prev => [...newLogs, ...prev].slice(0, 80));
      }
    });
    return () => unsub();
  }, [simPhase]);

  useEffect(() => {
    if (simPhase === 'attacking') {
      const interval = setInterval(() => {
        setLogs(prev => [{
          id: `sim-atk-${Date.now()}-${Math.random()}`,
          ts: Date.now(),
          level: 'CRIT',
          source: 'KERN',
          message: `FATAL: Exploitation sequence ${activeAttack?.mitre || 'T1110'} ${activeAttack?.name || 'Exploit'} executed memory violation`,
          icon: 'shield',
        }, ...prev].slice(0, 80));
      }, 300);
      return () => clearInterval(interval);
    }
  }, [simPhase, activeAttack]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [logs]);

  const getIcon = (type) => {
    switch (type) {
      case 'cpu': return <Cpu className="w-3.5 h-3.5 text-[#22D3EE]" />;
      case 'net': return <Wifi className="w-3.5 h-3.5 text-[#3B82F6]" />;
      case 'disk': return <HardDrive className="w-3.5 h-3.5 text-[#F59E0B]" />;
      case 'shield': return <Shield className="w-3.5 h-3.5 text-[#A855F7]" />;
      default: return <Terminal className="w-3.5 h-3.5 text-[#9CA3AF]" />;
    }
  };

  const getLevelStyle = (level) => {
    switch (level) {
      case 'CRIT': return 'text-[#EF4444] bg-[#EF4444]/10';
      case 'WARN': return 'text-[#F59E0B] bg-[#F59E0B]/10';
      default: return 'text-[#10B981] bg-[#10B981]/10';
    }
  };

  return (
    <div className="card-glow p-0 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 flex items-center justify-center border border-[#10B981]/25">
            <Terminal className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kernel Sim Log</h3>
            <p className="text-xs text-[#9CA3AF]">System Event Stream</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#10B981]/10 border border-[#10B981]/20">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_6px_#10B981]" />
          <span className="text-xs font-bold text-[#10B981] uppercase">LIVE</span>
        </div>
      </div>

      {/* Log Feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar font-mono">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#6B7280]">
            <Terminal className="w-8 h-8" />
            <span className="text-sm font-bold uppercase tracking-wider">Awaiting kernel events...</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
              <span className="text-xs text-[#6B7280] shrink-0 w-[55px] pt-0.5 text-right font-bold">
                {new Date(log.ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="shrink-0 pt-0.5">{getIcon(log.icon)}</span>
              <span className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded ${getLevelStyle(log.level)}`}>
                {log.level}
              </span>
              <span className="text-xs text-[#22D3EE] shrink-0 w-[36px] font-bold uppercase">
                {log.source}
              </span>
              <span className="text-xs text-[#9CA3AF] group-hover:text-white transition-colors leading-relaxed break-all">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
