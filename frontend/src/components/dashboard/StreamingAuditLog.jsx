import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, ShieldAlert, Cpu, Network, Zap } from 'lucide-react';
import socketManager from '../../services/useAegisSocket';

export default function StreamingAuditLog({ limit = 50, simPhase, activeAttack }) {
    const [events, setEvents] = useState([]);
    const containerRef = useRef(null);

    useEffect(() => {
        const unsubTelemetry = socketManager.subscribe('TELEMETRY', (data) => {
            if (!data) return;
            const cpu = data.system?.cpu_usage || 0;
            const ram = data.system?.ram_usage || 0;
            const net = data.network_io?.download_mbps || 0;
            const ev1 = {
                id: Date.now() + 'cpu',
                event_type: 'METRIC CPU SPIKE',
                timestamp: Date.now(),
                data: { usage_percent: cpu },
                source_identity: 'OS Query',
                source_node: 'aegis_sys_01',
                type: 'cpu'
            };
            const ev2 = {
                id: Date.now() + 'ram',
                event_type: 'METRIC RAM SPIKE',
                timestamp: Date.now(),
                data: { usage_percent: ram },
                source_identity: 'OS Query',
                source_node: 'aegis_sys_01',
                type: 'ram'
            };
            const ev3 = {
                id: Date.now() + 'net',
                event_type: 'NET CONNECTION ACTIVE',
                timestamp: Date.now(),
                data: { remote_ip: 'out.bound.net', download_mbps: net },
                source_identity: 'Network Filter',
                source_node: 'aegis_sys_01',
                type: 'net'
            };
            setEvents(prev => [ev1, ev2, ev3, ...prev].slice(0, limit));
        });

        const unsubThreats = socketManager.subscribe('THREATS', (threats) => {
            if (!threats || threats.length === 0) return;
            const t = threats[0];
            const ev = {
                id: Date.now() + 'thr' + t.id,
                event_type: 'SECURITY ALERT CRIT',
                timestamp: Date.now(),
                data: { title: t.threat_type },
                source_identity: t.source_ip,
                source_node: t.target_node || 'CORE_NODE',
                type: 'sec'
            };
            setEvents(prev => [ev, ...prev].slice(0, limit));
        });

        return () => {
            unsubTelemetry();
            unsubThreats();
        };
    }, [limit]);

    useEffect(() => {
        if (simPhase === 'attacking') {
            const interval = setInterval(() => {
                setEvents(prev => [{
                    id: Date.now() + 'sim' + Math.random(),
                    event_type: 'SECURITY ALERT CRIT',
                    timestamp: Date.now(),
                    data: { title: activeAttack?.name || 'VULNERABILITY EXPLOITED' },
                    source_identity: 'SIMULATION',
                    source_node: 'aegis_sys_01',
                    type: 'sec'
                }, ...prev].slice(0, limit));
            }, 250);
            return () => clearInterval(interval);
        }
    }, [simPhase, activeAttack, limit]);

    useEffect(() => {
        if(containerRef.current) containerRef.current.scrollTop = 0;
    }, [events]);

    const getEventIcon = (type) => {
        if (type === 'cpu') return <Cpu className="w-4 h-4 text-[#22D3EE]" />;
        if (type === 'ram') return <Activity className="w-4 h-4 text-[#10B981]" />;
        if (type === 'net') return <Network className="w-4 h-4 text-[#3B82F6]" />;
        if (type === 'sec') return <ShieldAlert className="w-4 h-4 text-[#EF4444]" />;
        return <Zap className="w-4 h-4 text-[#9CA3AF]" />;
    };

    return (
        <div className="flex flex-col h-full bg-[#0B0F1A] overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 p-4 custom-scrollbar" ref={containerRef}>
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-40 text-center gap-3">
                        <Terminal className="w-8 h-8 text-[#9CA3AF]" />
                        <div className="text-sm uppercase font-bold tracking-wider text-[#9CA3AF]">Awaiting live telemetry...</div>
                    </div>
                ) : (
                    events.map((event, i) => (
                        <div 
                            key={event.id || i}
                            className="bg-[#111827] rounded-xl p-4 border border-white/10 flex items-start gap-4 hover:border-[#22D3EE]/30 transition-all group"
                        >
                            <div className="p-2 rounded-lg border border-white/10 shrink-0 group-hover:border-[#22D3EE]/30 group-hover:bg-[#22D3EE]/10 transition-colors">
                                {getEventIcon(event.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-[#22D3EE] group-hover:text-white transition-colors">
                                        {event.event_type}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-[#6B7280] shrink-0">
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-white leading-relaxed font-mono">
                                    {event.type === 'net' ? (
                                        <>Connection to <span className="text-[#3B82F6]">{event.data.remote_ip || 'unknown'}</span> established</>
                                    ) : event.type === 'cpu' ? (
                                        <>Processor workload: <span className="text-[#22D3EE]">{event.data.usage_percent}%</span> saturation</>
                                    ) : event.type === 'sec' ? (
                                        <span className="text-[#EF4444] font-bold">⚠ {event.data.title}</span>
                                    ) : event.type === 'ram' ? (
                                        <>Memory usage: <span className="text-[#10B981]">{event.data.usage_percent}%</span> saturation</>
                                    ) : (
                                        JSON.stringify(event.data)
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-[#9CA3AF] font-bold flex items-center gap-2">
                                    <span className="bg-[#0B0F1A] px-2 py-1 rounded border border-white/5 uppercase tracking-wider">
                                        SRC: {event.source_identity}
                                    </span>
                                    <span className="bg-[#0B0F1A] px-2 py-1 rounded border border-white/5 uppercase tracking-wider">
                                        NODE: {event.source_node}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
