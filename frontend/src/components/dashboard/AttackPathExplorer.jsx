import React, { useState, useEffect } from 'react';
import { useAura } from '../layout/AuraProvider';
import { useAegisSocket } from '../../services/useAegisSocket';
import './AttackPathExplorer.css';

const NOMINAL_PATH = {
    nodes: [
        { id: 'user-01', label: 'User Domain', type: 'user', icon: '👤', status: 'HEALTHY', state: 'nominal' },
        { id: 'core-01', label: 'Aegis Core', type: 'master', icon: '🛡️', status: 'ACTIVE', state: 'nominal' },
        { id: 'svc-01', label: 'Internal Services', type: 'service', icon: '⚙️', status: 'SYNCED', state: 'nominal' },
        { id: 'db-01', label: 'Secure DB Cluster', type: 'database', icon: '🗄️', status: 'SECURE', state: 'nominal' }
    ],
    timeline: [
        { ts: '09:00', stage: 'System Initialization', impact: 'AuraEngine v8.2 core heartbeat verified' },
        { ts: '09:05', stage: 'Policy Sync', impact: 'All 14 security policies applied to edge gateway' },
        { ts: '10:12', stage: 'Monitoring', impact: 'No anomalies detected in last 3600s window' }
    ]
};

const BREACH_PATH = {
    nodes: [
        { id: 'ext-01', label: 'External Source', type: 'external', ip: '185.23.44.12', status: 'THREAT', state: 'threat' },
        { id: 'gw-01', label: 'API Gateway', type: 'gateway', status: 'COMPROMISED', state: 'threat' },
        { id: 'svc-01', label: 'Auth Service', type: 'service', status: 'INFILTRATED', state: 'warning' },
        { id: 'db-01', label: 'Core DB Cluster', type: 'database', status: 'TARGETED', state: 'nominal' }
    ],
    timeline: [
        { ts: '23:12', stage: 'Initial Access', impact: 'Credential stuffing detected on Gateway' },
        { ts: '23:24', stage: 'Lateral Movement', impact: 'Unauthorized RPC call to Auth Service' },
        { ts: '23:31', stage: 'Exfiltration', impact: 'Staging directory created on Core DB' }
    ]
};

const AttackPathExplorer = () => {
    const { aura } = useAura();
    const [isBreachActive, setIsBreachActive] = useState(false);
    const data = isBreachActive ? BREACH_PATH : NOMINAL_PATH;

    const { data: socketStatus } = useAegisSocket('SIMULATION');

    useEffect(() => {
        const processStatus = (status) => {
            const active = Object.values(status).some(s => s && s.status === 'running');
            setIsBreachActive(active);
        };

        if (socketStatus) {
            processStatus(socketStatus);
        }
    }, [socketStatus]);

    return (
        <div className="attack-path-panel flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isBreachActive ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#ff3366]' : 'bg-cyan-400 shadow-[0_0_8px_#00eaff]'}`}></div>
                    <h3 className="font-mono text-[10px] font-black tracking-[0.3em] uppercase text-white/90">
                        {isBreachActive ? '⚠ ACTIVE_BREACH_PATH_DETECTED' : 'SYSTEM_NOMINAL_TOPOLOGY_FLOW'}
                    </h3>
                </div>
                <div className="text-[9px] font-mono text-cyan-400/50">
                    AuraEngine_Security_Path_v8.5
                </div>
            </div>

            {/* Path Visualizer */}
            <div className="path-canvas-container flex-1">
                {data.nodes.map((node, idx) => (
                    <React.Fragment key={node.id}>
                        {/* Node Slot */}
                        <div className={`node-slot state-${node.state}`}>
                            <div className="node-status">{node.status}</div>
                            <div className="node-core">
                                {node.icon && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-80">{node.icon}</span>}
                            </div>
                            <div className="node-label">
                                <div>{node.label}</div>
                                <div className="opacity-40 text-[7px] mt-1">{node.ip || 'INTERNAL'}</div>
                            </div>
                        </div>

                        {/* Connection Line & Particles */}
                        {idx < data.nodes.length - 1 && (
                            <div className="flex-1 h-px bg-white/10 relative mx-4">
                                <div className={`flow-particle ${isBreachActive ? 'bg-red-500 shadow-[0_0_8px_#ff3366]' : ''}`} 
                                     style={{ animationDelay: `${idx * 0.5}s` }}></div>
                                <div className={`flow-particle ${isBreachActive ? 'bg-red-500 shadow-[0_0_8px_#ff3366]' : ''}`} 
                                     style={{ animationDelay: `${idx * 0.5 + 1.5}s` }}></div>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Stage Timeline */}
            <div className="path-timeline">
                <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">
                    Active_Security_Sequence_Log
                </div>
                {data.timeline.map((entry, idx) => (
                    <div key={idx} className="timeline-entry" style={{ animationDelay: `${idx * 0.2}s` }}>
                        <span className="ts">{entry.ts}</span>
                        <span className="stage">[{entry.stage}]</span>
                        <span className="impact">{entry.impact}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AttackPathExplorer;
;
