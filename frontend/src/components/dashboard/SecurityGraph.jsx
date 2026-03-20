import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAura } from '../layout/AuraProvider';
import * as d3 from 'd3-force';
import { useAegisSocket } from '../../services/useAegisSocket';
import './SecurityGraph.css';

const SecurityGraph = () => {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const graphRef = useRef();
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 }); // Start at 0 to force first resize
    const containerRef = useRef();
    const [hoverNode, setHoverNode] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const { aura } = useAura();

    useEffect(() => {
        // Standard mount
    }, []);

    // Use a more robust ResizeObserver pattern
    useEffect(() => {
        const handleResize = () => {
           if (containerRef.current) {
               const { clientWidth, clientHeight } = containerRef.current;
               if (clientWidth > 0 && clientHeight > 0) {
                   setDimensions({ width: clientWidth, height: clientHeight });
               }
           }
        };

        handleResize();
        const ro = new ResizeObserver(handleResize);
        if (containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', handleResize);
        
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const { data: socketGraphData } = useAegisSocket('GRAPH');

    useEffect(() => {
        let isCancelled = false;
        const processGraph = (data) => {
            if (isCancelled || !data) return;
            const enhancedNodes = (data.nodes || []).map(n => {
                let group = 'internal';
                if (n.id === 'local-node' || n.type === 'master' || n.id === 'AEGIS_CORE') group = 'core';
                if (n.type === 'ip' || n.type === 'external') group = 'external';
                
                return { 
                    ...n, 
                    group, 
                    val: group === 'core' ? 10 : group === 'external' ? 6 : 4,
                    colorRgb: group === 'core' ? '0, 234, 255' : group === 'external' ? (n.threat_score > 50 ? '255, 51, 102' : '255, 204, 0') : '0, 242, 255'
                };
            });

            setGraphData(prev => {
                const hasChanged = prev.nodes.length !== enhancedNodes.length || prev.links.length !== (data.links || []).length;
                if (!hasChanged) return prev;
                return { nodes: enhancedNodes, links: data.links || [] };
            });
        };

        if (socketGraphData) {
            processGraph(socketGraphData);
        }

        return () => { isCancelled = true; };
    }, [socketGraphData]);

    const nodeMap = useMemo(() => {
        const map = new Map();
        graphData.nodes.forEach(n => map.set(n.id, n));
        return map;
    }, [graphData.nodes]);

    useEffect(() => {
        if (!graphRef.current || graphData.nodes.length === 0) return;
        
        const fg = graphRef.current;
        fg.d3Force('radial', null);
        fg.d3Force('charge', d3.forceManyBody().strength(-250)); // Reduced repulsion for smaller card
        fg.d3Force('center', d3.forceCenter(0, 0));

        const forceY = d3.forceY().y(node => {
            if (node.id === 'user_1' || node.id === 'AEGIS_CORE') return -80; // Tighter Y
            if (node.group === 'core') return -40;
            if (node.group === 'external') return 90;
            return 10;
        }).strength(1.5);
        
        fg.d3Force('y', forceY);
        fg.d3Force('collide', d3.forceCollide().radius(node => (node.group === 'core' ? 45 : 30)).iterations(4));
        fg.d3Force('link').distance(50).strength(0.8);

        // Reheat only on structural change
        fg.d3ReheatSimulation();
    }, [graphData]);

    const drawBackground = useCallback((ctx, globalScale) => {
        const width = 3000;
        const height = 3000;
        ctx.fillStyle = '#050b18';
        ctx.fillRect(-width/2, -height/2, width, height);

        const gridScale = globalScale || 1;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
        ctx.lineWidth = 1 / gridScale;
        ctx.beginPath();
        for (let x = -width/2; x < width/2; x += 30) {
            ctx.moveTo(x, -height/2); ctx.lineTo(x, height/2);
        }
        for (let y = -height/2; y < height/2; y += 30) {
            ctx.moveTo(-width/2, y); ctx.lineTo(width/2, y);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 234, 255, 0.1)';
        ctx.setLineDash([4, 4]);
        const layers = [
            { y: -100, label: "[ USER DOMAIN ]" },
            { y: 0, label: "[ HOST INTRANET ]" },
            { y: 100, label: "[ EXTERNAL GATEWAY ]" }
        ];
        ctx.font = `${10 / gridScale}px "space-mono", monospace`;
        ctx.textAlign = 'left';
        layers.forEach(layer => {
            ctx.beginPath();
            ctx.moveTo(-width/2, layer.y); ctx.lineTo(width/2, layer.y);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 234, 255, 0.4)';
            ctx.fillText(layer.label, -width/4, layer.y - (4/gridScale));
        });
        ctx.setLineDash([]);
    }, []);

    const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
        if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') return;
        
        const now = Date.now();
        const isHovered = hoverNode === node;
        const label = node.label || node.id;
        const scale = globalScale || 1;
        const fontSize = (isHovered ? 14 : 11) / scale;
        
        const color = node.group === 'core' ? (aura.accent || '#00eaff') : (node.group === 'external' ? (node.threat_score > 50 ? '#ff3366' : '#ffcc00') : '#00f2ff');
        const size = node.group === 'core' ? 8 : (node.group === 'external' ? 6 : 4);
        const glowSize = node.group === 'core' ? 30 : (node.group === 'external' ? 20 : 10);
        
        let pRate = 0;
        if (node.group === 'core') pRate = (Math.sin(now / 400) + 1) / 2;
        else if (node.group === 'external' && node.threat_score > 50) pRate = (Math.sin(now / 200) + 1) / 2;
        
        const drawSize = size * (1 + (pRate * 0.2));
        const outerGlowRadius = drawSize + (glowSize / scale);

        if (outerGlowRadius > drawSize) {
            const gradient = ctx.createRadialGradient(node.x, node.y, drawSize, node.x, node.y, outerGlowRadius);
            gradient.addColorStop(0, `rgba(${node.colorRgb || '0, 234, 255'}, ${0.4 + (pRate * 0.2)})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.beginPath();
            ctx.arc(node.x, node.y, outerGlowRadius, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, drawSize, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        if (isHovered || node.group === 'core' || (node.threat_score > 50)) {
            ctx.font = `${isHovered ? 'bold ' : ''}${fontSize}px "Space Mono"`;
            ctx.textAlign = 'center';
            ctx.fillStyle = isHovered ? '#fff' : 'rgba(255, 255, 255, 0.7)';
            if (isHovered) {
                const textWidth = ctx.measureText(label).width;
                ctx.fillStyle = 'rgba(5, 11, 24, 0.8)';
                ctx.fillRect(node.x - textWidth/2 - 4, node.y + drawSize + (8/scale), textWidth + 8, fontSize + 4);
                ctx.fillStyle = '#fff';
            }
            ctx.fillText(label, node.x, node.y + drawSize + (20 / scale));
        }
    }, [aura.accent, hoverNode]);

    return (
        <div className="security-graph-panel flex flex-col h-full relative" ref={containerRef}>
            <div className="panel-header absolute top-0 left-0 right-0 z-10 px-4 py-3 pointer-events-none flex justify-between items-center">
                <h3 className="font-mono text-[10px] tracking-widest text-[#9be7ff] uppercase drop-shadow-[0_0_4px_rgba(0,255,255,0.5)]">
                    TEMPORAL SECURITY TOPOLOGY v6.2
                </h3>
            </div>
            
            <div className="graph-container flex-1 bg-[#050b18] w-full min-h-[300px] overflow-hidden relative">
                <ForceGraph2D
                    ref={graphRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    nodeCanvasObject={nodeCanvasObject}
                    onRenderFramePre={drawBackground}
                    cooldownTicks={40}
                    d3AlphaDecay={0.08}
                    d3VelocityDecay={0.4}
                    minZoom={4}
                    maxZoom={4}
                    enableNodeDrag={false}
                    enablePanInteraction={true}
                    enableZoomInteraction={true}
                    onNodeHover={setHoverNode}
                    onNodeClick={(node) => setSelectedNode(node)}
                    linkColor={l => {
                        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                        const targetNode = nodeMap.get(targetId);
                        return (targetNode && targetNode.threat_score > 50) ? 'rgba(255, 51, 102, 0.6)' : 'rgba(0, 234, 255, 0.2)';
                    }}
                    linkWidth={l => {
                        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                        const targetNode = nodeMap.get(targetId);
                        return (targetNode && targetNode.threat_score > 50) ? 3 : 1;
                    }}
                    linkDirectionalParticles={l => {
                        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                        const targetNode = nodeMap.get(targetId);
                        return (targetNode && targetNode.threat_score > 50) ? 5 : 2;
                    }}
                    linkDirectionalParticleSpeed={0.02}
                    linkDirectionalParticleWidth={3}
                    linkDirectionalParticleColor={l => {
                        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                        const targetNode = nodeMap.get(targetId);
                        return (targetNode && targetNode.threat_score > 50) ? '#ff3366' : '#00eaff';
                    }}
                />
            </div>
            
            {/* Interactive Forensics Sidebar */}
            {selectedNode && (
                <div className="absolute right-4 top-16 w-80 bg-[#050b18]/95 border border-[var(--color-accent)]/30 rounded-lg p-5 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl z-20 animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${selectedNode.threat_score > 50 ? 'bg-red-500 shadow-[0_0_10px_#ff0000] animate-pulse' : 'bg-cyan-400 shadow-[0_0_10px_#00ffff]'}`}></div>
                            <h3 className="font-mono font-black text-white">{selectedNode.label}</h3>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white transition-colors">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-black/40 p-2 rounded border border-white/5">
                                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono block mb-1">Type</span>
                                <span className="text-xs font-mono text-cyan-400 uppercase">{selectedNode.type}</span>
                            </div>
                            <div className="bg-black/40 p-2 rounded border border-white/5">
                                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono block mb-1">Risk Map</span>
                                <span className={`text-xs font-mono font-bold ${selectedNode.threat_score > 50 ? 'text-red-400' : 'text-emerald-400'}`}>{selectedNode.threat_score || 0}/100</span>
                            </div>
                        </div>

                        {selectedNode.threat_score > 50 && selectedNode.threat_detail && (
                            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded space-y-2">
                                <span className="text-[9px] text-red-400 uppercase tracking-widest font-mono font-bold flex items-center gap-2">
                                    <i className="fas fa-radiation"></i> ACTIVE THREAT DETECTED
                                </span>
                                <div className="text-sm text-white font-mono">{selectedNode.threat_detail.replace(/_/g, ' ')}</div>
                                <div className="text-[10px] text-red-200/60 uppercase">Severity: {selectedNode.severity}</div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-white/10 flex justify-between">
                             <button className="text-[9px] uppercase tracking-widest font-bold text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-400/10 px-3 py-1.5 rounded">
                                 Isolate Node
                             </button>
                             <button className="text-[9px] uppercase tracking-widest font-bold text-white hover:text-gray-300 transition-colors bg-white/5 px-3 py-1.5 rounded border border-white/10">
                                 Query Logs
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurityGraph;
