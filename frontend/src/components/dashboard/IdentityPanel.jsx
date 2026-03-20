import React from 'react';
import { Shield, Activity, Fingerprint, Cpu, Globe, Zap } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';

const IdentityPanel = ({ simPhase, activeAttack }) => {
    const { data: liveProfiles } = useAegisSocket('IDENTITY');
    const profiles = liveProfiles ?? [];

    const isAttacking = simPhase === 'attacking';
    const displayProfiles = isAttacking 
        ? profiles.map((p, i) => i === 0 || i === 2 ? {...p, risk_score: 99, role: 'COMPROMISED'} : p)
        : profiles;

    const getRiskLevel = (score) => {
        if (score > 70) return 'critical';
        if (score > 30) return 'warning';
        return 'nominal';
    };

    const getRiskColor = (score) => {
        const level = getRiskLevel(score);
        if (level === 'critical') return '#EF4444';
        if (level === 'warning') return '#F59E0B';
        return '#22D3EE';
    };

    return (
        <div className="card-glow flex flex-col h-full bg-[#0B0F1A]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0B0F1A] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 border border-[#22D3EE]/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <Fingerprint className="w-5 h-5 text-[#22D3EE]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Identity Profiles</h3>
                        <p className="text-xs text-[#9CA3AF] font-mono tracking-widest uppercase">Principal Risk</p>
                    </div>
                </div>
                <div className="text-xs font-mono font-bold text-[#6B7280] px-3 py-1 bg-[#111827] rounded-lg border border-white/10">
                    SYNC: 4.0s
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {displayProfiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 text-center gap-3">
                         <div className="text-sm uppercase font-bold tracking-widest font-mono text-[#9CA3AF]">Nominal State Verified</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayProfiles.map((p, idx) => (
                            <div 
                                key={idx} 
                                className="bg-[#111827] rounded-xl p-4 flex items-center justify-between border border-white/10 hover:border-white/20 transition-all group"
                                style={{ borderLeftWidth: 4, borderLeftColor: getRiskColor(p.risk_score) }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-[#0B0F1A] border border-white/10 flex items-center justify-center font-bold font-mono text-lg transition-colors group-hover:bg-white/5" style={{ color: getRiskColor(p.risk_score) }}>
                                        {p.username[0].toUpperCase()}{p.username[1]?.toUpperCase() || ''}
                                    </div>
                                    
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="text-sm font-bold font-mono text-white tracking-wider uppercase">{p.username}</div>
                                            {p.privilege > 2 && <Shield className="w-4 h-4 text-[#EF4444]" />}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">{p.role}</span>
                                            {p.is_active && (
                                                <span className="text-xs font-mono font-bold text-[#10B981] flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10B981]/10">
                                                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span> LIVE
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xs text-[#6B7280] font-bold uppercase tracking-wider mb-1">Sessions</div>
                                        <div className="text-sm font-bold font-mono text-white text-center">{p.active_sessions}</div>
                                    </div>
                                    <div className="text-right border-l border-white/10 pl-6 space-y-1">
                                        <div className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Risk ID</div>
                                        <div className="text-sm font-bold font-mono" style={{ color: getRiskColor(p.risk_score) }}>
                                            {p.risk_score.toString().padStart(2, '0')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-[#111827] border-t border-white/10 flex items-center justify-between shrink-0">
                <div className="text-xs font-mono font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#22D3EE]" /> Coverage 100%
                </div>
                <div className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#10B981]" /> All Sessions Verified
                </div>
            </div>
        </div>
    );
};

export default IdentityPanel;
