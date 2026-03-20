import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAura } from '../layout/AuraProvider';
import { useAegisSocket } from '../../services/useAegisSocket';
import './LayeredSecurityMatrix.css';

// Fixed Grid Infrastructure Definitions
const INFRA_NODES = [
    // Top Layer: USER DOMAIN (y: 15-25%)
    { id: 'user_raj', label: 'USER_RAJ', type: 'user', icon: '👤', x: 30, y: 15, layer: 'user' },
    { id: 'workstation_alt', label: 'WS_ALPHA_SEC', type: 'user', icon: '💻', x: 70, y: 15, layer: 'user' },

    // Center Layer: SYSTEM CORE (y: 45-55%)
    { id: 'api_gateway', label: 'API_GATEWAY', type: 'system', icon: '🔌', x: 20, y: 48, layer: 'system' },
    { id: 'ai_engine', label: 'AI_INSIGHTS', type: 'system', icon: '🧠', x: 40, y: 48, layer: 'system' },
    { id: 'monitor_node', label: 'SYS_MONITOR', type: 'system', icon: '📊', x: 60, y: 48, layer: 'system' },
    { id: 'db_primary', label: 'DB_PRODUCTION', type: 'system', icon: '🗄️', x: 80, y: 48, layer: 'system' },

    // Bottom Layer: THREAT ZONE (y: 75-85%)
    { id: 'gw_ext', label: 'EXT_INGRESS', type: 'gateway', icon: '🌐', x: 50, y: 78, layer: 'threat' },
    { id: 'threat_source', label: 'UNKNOWN_IP_185.X', type: 'external', icon: '💀', x: 50, y: 92, layer: 'threat' }
];

const INFRA_CONNECTIONS = [
    { from: 'gw_ext', to: 'api_gateway' },
    { from: 'api_gateway', to: 'ai_engine' },
    { from: 'api_gateway', to: 'db_primary' },
    { from: 'api_gateway', to: 'monitor_node' },
    { from: 'user_raj', to: 'api_gateway' },
    { from: 'workstation_alt', to: 'api_gateway' },
    { from: 'threat_source', to: 'gw_ext' }
];

const LayeredSecurityMatrix = () => {
    const { aura } = useAura();
    const [isBreachActive, setIsBreachActive] = useState(false);
    const [focusedPath, setFocusedPath] = useState([]);
    const matrixRef = useRef(null);

    const { data: socketStatus } = useAegisSocket('SIMULATION');

    // Simulation Data Sync
    useEffect(() => {
        const processStatus = (status) => {
            const active = Object.values(status).some(s => s && s.status === 'running');
            setIsBreachActive(active);

            if (active) {
                setFocusedPath(['threat_source', 'gw_ext', 'api_gateway', 'db_primary']);
            } else {
                setFocusedPath([]);
            }
        };

        if (socketStatus) {
            processStatus(socketStatus);
        }
    }, [socketStatus]);

    const getNodeStatus = (nodeId) => {
        if (!isBreachActive) return 'NOMINAL';
        if (nodeId === 'threat_source') return 'MALICIOUS';
        if (focusedPath.includes(nodeId)) {
            const idx = focusedPath.indexOf(nodeId);
            if (idx <= 1) return 'THREAT';
            return 'COMPROMISED';
        }
        return 'NOMINAL';
    };

    const getNodeStateClass = (nodeId) => {
        if (!isBreachActive) return 'node-nominal';
        if (nodeId === 'threat_source') return 'node-threat';
        if (focusedPath.includes(nodeId)) {
            const idx = focusedPath.indexOf(nodeId);
             return idx <= 1 ? 'node-threat' : 'node-warning';
        }
        return 'node-nominal';
    };

    return (
        <div className={`security-matrix-container ${focusedPath.length > 0 ? 'matrix-dimmed' : ''}`} ref={matrixRef}>
            {/* Layer Labels */}
            <div className="matrix-layer-label label-user">USER DOMAIN</div>
            <div className="matrix-layer-label label-system">SYSTEM CORE</div>
            <div className="matrix-layer-label label-threat">EXTERNAL THREAT ZONE</div>

            {/* Dividers */}
            <div className="matrix-divider divider-1"></div>
            <div className="matrix-divider divider-2"></div>

            {/* SVG Connections Overlay */}
            <svg className="matrix-svg">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {INFRA_CONNECTIONS.map((conn, idx) => {
                    const fromNode = INFRA_NODES.find(n => n.id === conn.from);
                    const toNode = INFRA_NODES.find(n => n.id === conn.to);
                    if (!fromNode || !toNode) return null;

                    const isFocused = focusedPath.includes(conn.from) && focusedPath.includes(conn.to) && 
                                     Math.abs(focusedPath.indexOf(conn.from) - focusedPath.indexOf(conn.to)) === 1;
                    
                    const isThreat = isBreachActive && isFocused;

                    return (
                        <g key={`${conn.from}-${conn.to}`}>
                            <line 
                                x1={`${fromNode.x}%`} y1={`${fromNode.y}%`} 
                                x2={`${toNode.x}%`} y2={`${toNode.y}%`} 
                                className={`matrix-connection ${isFocused ? 'connection-focused' : ''} ${isThreat ? 'connection-threat' : 'connection-active'}`}
                            />
                            
                            {/* Particle Flow Animation */}
                            {(isFocused || (!isBreachActive && fromNode.layer === 'user')) && (
                                <circle r="1.5" className={`matrix-particle ${isThreat ? 'particle-threat' : ''}`}>
                                    <animate 
                                        attributeName="cx" 
                                        from={`${fromNode.x}%`} to={`${toNode.x}%`} 
                                        dur={isThreat ? "1.2s" : "2.5s"} 
                                        begin={`${idx * 0.3}s`}
                                        repeatCount="indefinite" 
                                    />
                                    <animate 
                                        attributeName="cy" 
                                        from={`${fromNode.y}%`} to={`${toNode.y}%`} 
                                        dur={isThreat ? "1.2s" : "2.5s"} 
                                        begin={`${idx * 0.3}s`}
                                        repeatCount="indefinite" 
                                    />
                                    <animate attributeName="opacity" values="0;1;0" dur={isThreat ? "1.2s" : "2.5s"} begin={`${idx * 0.3}s`} repeatCount="indefinite" />
                                </circle>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Nodes */}
            {INFRA_NODES.map(node => (
                <div 
                    key={node.id}
                    className={`matrix-node ${getNodeStateClass(node.id)} ${focusedPath.includes(node.id) ? 'matrix-focused' : ''}`}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                    <div className="matrix-node-status">{getNodeStatus(node.id)}</div>
                    <div className="matrix-node-core">
                        <span className="matrix-node-icon">{node.icon}</span>
                    </div>
                    <div className="matrix-node-label">{node.label}</div>
                </div>
            ))}

            {/* Legend */}
            <div className="matrix-legend">
                <div className="legend-item">
                    <div className="legend-dot bg-[#00eaff] shadow-[0_0_5px_#00eaff]"></div>
                    <span>Nominal Flow</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot bg-[#ff3366] shadow-[0_0_8px_#ff3366]"></div>
                    <span>Threat Vectors</span>
                </div>
            </div>
        </div>
    );
};

export default LayeredSecurityMatrix;
