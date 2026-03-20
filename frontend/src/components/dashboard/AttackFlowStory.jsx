import React, { useState, useEffect } from 'react';
import { useAura } from '../layout/AuraProvider';
import { useAegisSocket } from '../../services/useAegisSocket';
import './AttackFlowStory.css';

const NOMINAL_STORY = {
    nodes: [
        { id: 'src', title: 'User Domain', icon: '👤', meta: { Source: 'Verified', ID: 'RAJ_DEV_01' }, status: 'HEALTHY', theme: 'nominal' },
        { id: 'entry', title: 'Service Mesh', icon: '🔌', meta: { Port: '443/TLS', Load: 'Minimal' }, status: 'READY', theme: 'nominal' },
        { id: 'core', title: 'Aegis Core', icon: '🛡️', meta: { CPU: '12%', Thread: 'Main' }, status: 'OPTIMAL', theme: 'nominal' },
        { id: 'target', title: 'Production DB', icon: '🗄️', meta: { State: 'Encrypted', IO: 'Normal' }, status: 'SECURE', theme: 'nominal' }
    ],
    timeline: [
        { time: '09:00:00', event: 'Aura Protocol Handshake' },
        { time: '09:45:12', event: 'Edge Identity Verified' },
        { time: '10:12:33', event: 'Nominal Heartbeat' }
    ]
};

const BREACH_STORY = {
    nodes: [
        { id: 'src', title: 'Threat Source', icon: '💀', idClass: 'card-threat', meta: { IP: '185.23.44.12', Geo: 'Unknown' }, status: 'MALICIOUS', theme: 'threat' },
        { id: 'entry', title: 'Entry Vector', icon: '🔓', idClass: 'card-threat', meta: { Type: 'Process', Desc: 'powershell.exe' }, status: 'EXPLOITED', theme: 'threat' },
        { id: 'core', title: 'Aegis Core', icon: '⚠️', meta: { Load: '88%', Alert: 'Anomalous' }, status: 'INFILTRATED', theme: 'warning' },
        { id: 'target', title: 'Target Cluster', icon: '🎯', meta: { Access: 'Attempted', Path: '/db/core' }, status: 'TARGETED', theme: 'warning' }
    ],
    timeline: [
        { time: '22:31:05', event: 'Brute Force Detected' },
        { time: '22:32:10', event: 'Process Injection (PS)' },
        { time: '22:33:45', event: 'Lateral Movement Attempt' }
    ]
};

const AttackFlowStory = ({ simPhase, activeAttack }) => {
    const { aura } = useAura();
    const { data: socketStatus } = useAegisSocket('SIMULATION');
    
    // Find the latest active simulation
    const activeSim = socketStatus ? Object.values(socketStatus).reverse().find(s => s.status === 'running') : null;
    const isBreachActive = !!activeSim || simPhase === 'attacking';
    const story = isBreachActive ? BREACH_STORY : NOMINAL_STORY;

    // Map simulation step/node metadata to visual highlighted node
    const activeNodeId = activeSim?.active_node;

    return (
        <div className="card-glow flex flex-col h-full bg-[#0B0F1A]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-[#0B0F1A]">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isBreachActive ? 'bg-[#EF4444] animate-pulse shadow-[0_0_12px_#ef4444]' : 'bg-[#10B981] shadow-[0_0_12px_#10b981]'}`}></div>
                    <h3 className={`font-mono text-sm font-black uppercase tracking-widest ${isBreachActive ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        {isBreachActive ? `⚠ ATTACK IN PROGRESS: ${activeAttack?.name || activeSim?.scenario?.toUpperCase() || 'EXTERNAL BREACH'}` : 'SYSTEM NOMINAL FLOW NARRATIVE'}
                    </h3>
                </div>
                <div className="text-xs font-mono font-bold text-[#6B7280] uppercase tracking-wider">
                    {isBreachActive ? `STEP: ${activeSim?.current_step}` : 'Aura_StoryEngine_v9.1'}
                </div>
            </div>

            {/* Narrative Story Line */}
            <div className="flex-1 min-h-0 relative p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between h-40 relative">
                    {/* Background connector line */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2 rounded-full z-0 overflow-hidden">
                        <div className={`h-full ${isBreachActive ? 'bg-[#EF4444]/30' : 'bg-[#22D3EE]/30'} w-full`}></div>
                    </div>
                    
                    {story.nodes.map((node, idx) => {
                        const nodeIndex = idx;
                        const activeNodeIndex = story.nodes.findIndex(n => n.id === activeNodeId);
                        
                        const isBreached = isBreachActive && activeNodeIndex > nodeIndex;
                        const isActiveTarget = isBreachActive && activeNodeId === node.id;
                        
                        let themeColor = isBreached ? '#EF4444' : isActiveTarget ? '#F59E0B' : '#22D3EE';
                        if (!isBreachActive && node.theme === 'threat') themeColor = '#EF4444';
                        if (!isBreachActive && node.theme === 'warning') themeColor = '#F59E0B';

                        return (
                            <div key={node.id} className="relative z-10 w-48 flex flex-col items-center group">
                                <div className={`w-full bg-[#111827] border ${isActiveTarget ? 'border-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.4)]' : isBreached ? 'border-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-[#22D3EE]/30'} rounded-xl p-4 shadow-lg transition-all duration-500 ${isActiveTarget ? 'scale-110 -translate-y-2' : ''}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-sm font-black uppercase tracking-wider ${isBreached ? 'text-[#EF4444]' : isActiveTarget ? 'text-[#F59E0B]' : 'text-white'}`}>{node.title}</span>
                                        <span className={`text-xl ${isActiveTarget ? 'animate-bounce' : ''}`}>{node.icon}</span>
                                    </div>
                                    <div className="space-y-1.5 mb-3">
                                        {Object.entries(node.meta).map(([key, val]) => (
                                            <div key={key} className="flex justify-between items-center text-xs">
                                                <span className="text-[#9CA3AF] font-bold">{key}:</span>
                                                <span className="text-white font-mono">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`text-center py-1 text-xs font-black uppercase tracking-widest rounded border transition-colors duration-500`}
                                        style={{ color: themeColor, backgroundColor: `${themeColor}15`, borderColor: `${themeColor}40` }}>
                                        {isActiveTarget ? '→ TARGET ←' : isBreached ? '⚠ BREACHED ⚠' : node.status}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Timeline Log */}
                <div className="mt-auto bg-[#111827] rounded-xl border border-white/10 p-4 space-y-3">
                    <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Live Execution Timeline</div>
                    <div className="flex flex-col gap-2 relative">
                        {isBreachActive ? (
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-mono font-bold text-[#EF4444] w-20 shrink-0">{new Date().toLocaleTimeString([], {hour12: false})}</span>
                                <div className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_#ef4444] animate-pulse shrink-0"></div>
                                <span className="text-sm font-bold uppercase tracking-wider text-[#EF4444]">{activeSim?.current_step}</span>
                            </div>
                        ) : (
                            story.timeline.map((step, idx) => (
                                <div key={idx} className="flex items-center gap-4">
                                    <span className="text-xs font-mono font-bold text-[#22D3EE] w-20 shrink-0">{step.time}</span>
                                    <div className={`w-2 h-2 rounded-full bg-[#22D3EE] shadow-[0_0_8px_#22d3ee] shrink-0`}></div>
                                    <span className={`text-sm font-bold uppercase tracking-wider text-white`}>{step.event}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttackFlowStory;
