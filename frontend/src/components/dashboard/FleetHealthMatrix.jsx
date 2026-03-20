import React from 'react';
import { useAegisSocket } from '../../services/useAegisSocket';
import './FleetHealthMatrix.css';

const FleetHealthMatrix = ({ simPhase, activeAttack }) => {
    const { data: liveNodes } = useAegisSocket('FLEET');
    const nodes = liveNodes ?? [];
    
    const isAttacking = simPhase === 'attacking';
    const displayNodes = isAttacking 
        ? nodes.map((n, i) => (i % 2 === 0 ? {...n, status: 'critical', risk_score: 99, metrics: {cpu: 100, mem: 98}} : {...n, status: 'warning', risk_score: 75, metrics: {cpu: 80, mem: 70}})) 
        : nodes;

    const getStatusColor = (status) => {
        switch (status) {
            case 'nominal': return '#22D3EE';
            case 'warning': return '#F59E0B';
            case 'critical': return '#EF4444';
            default: return '#6B7280';
        }
    };

    return (
        <div className="card-glow flex flex-col h-full">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#22D3EE]/15 flex items-center justify-center border border-[#22D3EE]/25">
                        <span className="text-[#22D3EE] text-sm">⚡</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fleet Matrix</h3>
                        <p className="text-xs text-[#9CA3AF]">Multi-Node Health</p>
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border ${isAttacking ? 'bg-[#EF4444]/10 border-[#EF4444]/30' : 'bg-[#10B981]/10 border-[#10B981]/20'}`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${isAttacking ? 'bg-[#EF4444] shadow-[0_0_6px_#EF4444]' : 'bg-[#10B981] shadow-[0_0_6px_#10B981]'}`} />
                    <span className={`text-xs font-bold ${isAttacking ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{isAttacking ? 'CRITICAL' : `${nodes.length} ONLINE`}</span>
                </div>
            </div>
            <div className="fleet-grid flex-1 overflow-y-auto p-3 custom-scrollbar gap-2">
                {displayNodes.map(node => (
                    <div key={node.node_id} className={`node-card-v7 ${node.status} bg-[#0B0F1A] border border-white/10 p-3 rounded-lg hover:border-[#22D3EE]/30 transition-all group/node`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: getStatusColor(node.status) }} />
                                <span className="text-xs font-bold font-mono text-white tracking-wider group-hover/node:text-[#22D3EE] transition-colors uppercase">{node.hostname.split('.')[0]}</span>
                            </div>
                            <div className="text-xs font-mono font-bold px-2 py-0.5 rounded border" style={{ color: getStatusColor(node.status), backgroundColor: `${getStatusColor(node.status)}15`, borderColor: `${getStatusColor(node.status)}30` }}>
                                {node.risk_score}%
                            </div>
                        </div>
                        
                        {node.is_simulation_active && (
                            <div className="mb-2 px-2 py-1 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[10px] font-bold text-[#F59E0B] animate-pulse flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                                ⚠️ SIM ACTIVE
                            </div>
                        )}
                        <div className="space-y-1.5 mb-2">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="w-8 text-[#9CA3AF] font-bold uppercase font-mono">CPU</span>
                                <div className="flex-1 h-1.5 bg-[#111827] rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-[#22D3EE]/50 rounded-full" style={{ width: `${node.metrics.cpu}%` }} />
                                </div>
                                <span className="w-8 text-right font-mono text-white font-bold">{node.metrics.cpu}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="w-8 text-[#9CA3AF] font-bold uppercase font-mono">MEM</span>
                                <div className="flex-1 h-1.5 bg-[#111827] rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-[#10B981]/50 rounded-full" style={{ width: `${node.metrics.mem}%` }} />
                                </div>
                                <span className="w-8 text-right font-mono text-white font-bold">{node.metrics.mem}%</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="text-[10px] font-mono text-[#6B7280]">ID: {node.node_id.slice(0, 8)}</span>
                            <span className="text-xs font-bold uppercase font-mono" style={{ color: getStatusColor(node.status) }}>
                                {node.status === 'nominal' ? '✓ HEALTHY' : `⚠ ${node.status.toUpperCase()}`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FleetHealthMatrix;
