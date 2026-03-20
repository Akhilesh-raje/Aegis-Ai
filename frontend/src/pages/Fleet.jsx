import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Activity, Server, Users, Terminal, CheckCircle, XCircle, Zap, ShieldOff } from 'lucide-react';
import { useAegisSocket } from '../services/useAegisSocket';

const ATTACK_TYPES = [
  { id: 'DDoS Flood', label: 'DDoS Flood', color: 'red' },
  { id: 'Ransomware', label: 'Ransomware', color: 'orange' },
  { id: 'SQL Injection', label: 'SQL Injection', color: 'yellow' },
  { id: 'Brute Force', label: 'Brute Force SSH', color: 'purple' },
  { id: 'Data Exfiltration', label: 'Data Exfiltration', color: 'pink' },
];

const Fleet = () => {
  const [commandStatus, setCommandStatus] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [attackMenu, setAttackMenu] = useState(null); // node_id when menu is open

  const { data: fleetData } = useAegisSocket('FLEET');
  const { data: identityData } = useAegisSocket('IDENTITY');
  const { data: commandData } = useAegisSocket('COMMAND_UPDATES', 0);

  const fleetNodes = Array.isArray(fleetData) ? fleetData : [];
  const identities = Array.isArray(identityData) ? identityData : [];

  // Keep selectedNode in sync with live data
  useEffect(() => {
    if (selectedNode) {
      const updated = fleetNodes.find(n => n.node_id === selectedNode.node_id);
      if (updated) setSelectedNode(updated);
    }
  }, [fleetNodes]);

  useEffect(() => {
    if (commandData && commandData.node_id) {
      setCommandStatus(prev => ({
        ...prev,
        [commandData.node_id]: {
          status: commandData.status,
          detail: commandData.detail || '',
          timestamp: Date.now()
        }
      }));
      if (commandData.status === 'success' || commandData.status === 'failed') {
        const nodeId = commandData.node_id;
        setTimeout(() => {
          setCommandStatus(prev => {
            const updated = { ...prev };
            if (updated[nodeId]?.timestamp <= Date.now() - 4000) {
              delete updated[nodeId];
            }
            return updated;
          });
        }, 5000);
      }
    }
  }, [commandData]);

  const dispatchCommand = async (nodeId, action, params = {}) => {
    setCommandStatus(prev => ({
      ...prev,
      [nodeId]: { status: 'executing', detail: `Dispatching ${action}...` }
    }));
    try {
      const res = await fetch('/api/fleet/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, action, params })
      });
      if (!res.ok) throw new Error('Failed to dispatch');
      setCommandStatus(prev => ({
        ...prev,
        [nodeId]: { status: 'executing', detail: 'Waiting for agent ACK...' }
      }));
    } catch (e) {
      setCommandStatus(prev => ({
        ...prev,
        [nodeId]: { status: 'failed', detail: e.message }
      }));
    }
  };

  const launchAttack = (nodeId, attackType) => {
    setAttackMenu(null);
    dispatchCommand(nodeId, 'simulate_attack', { attack_type: attackType });
  };

  const neutralize = (nodeId) => {
    dispatchCommand(nodeId, 'neutralize');
  };

  const getNodeIdentity = (nodeId) => {
    return identities.find(i => i.username === nodeId || i.username.includes(nodeId));
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2 shadow-neon">
            Fleet & Identities
          </h1>
          <p className="text-gray-400">Manage distributed agents and organizational identity profiles</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Nodes List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Connected Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {fleetNodes.length === 0 ? (
                <div className="col-span-2 p-8 text-center bg-gray-900/40 border border-gray-800 rounded-xl">
                  <Server className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No agents registered.</p>
                </div>
              ) : (
                fleetNodes.map((node) => {
                  const isUnderAttack = !!node.attack_info;
                  const isHighRisk = node.risk_score > 60;
                  const isDegraded = node.status === 'degraded' || node.status === 'offline';
                  const cStatus = commandStatus[node.node_id];
                  const isRemote = node.node_id !== 'local-node';

                  return (
                    <motion.div
                      key={node.node_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedNode(node)}
                      className={`relative p-5 rounded-xl border transition-all cursor-pointer ${
                        selectedNode?.node_id === node.node_id ? 'ring-2 ring-cyan-500 bg-gray-800' : 'bg-gray-900 hover:bg-gray-800'
                      } ${isUnderAttack 
                          ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-pulse' 
                          : isHighRisk 
                            ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                            : 'border-gray-800'}`}
                    >
                      {/* Attack Pulse Overlay */}
                      {isUnderAttack && (
                        <div className="absolute inset-0 rounded-xl bg-red-500/5 pointer-events-none" />
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            isUnderAttack ? 'bg-red-500/30 text-red-400 animate-pulse' :
                            isHighRisk ? 'bg-red-500/20 text-red-500' : 'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {isUnderAttack ? <ShieldAlert size={20} /> : isHighRisk ? <ShieldAlert size={20} /> : <Server size={20} />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{node.hostname}</h3>
                            <p className="text-xs text-gray-400 font-mono">{node.node_id}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          isUnderAttack ? 'bg-red-500/30 text-red-300 animate-pulse' :
                          node.status === 'nominal' ? 'bg-green-500/20 text-green-400' :
                          node.status === 'critical' ? 'bg-red-500/20 text-red-400' :
                          isDegraded ? 'bg-gray-500/20 text-gray-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {isUnderAttack ? '🔴 UNDER ATTACK' : node.status}
                        </div>
                      </div>

                      {/* Attack Info Banner */}
                      {isUnderAttack && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mb-3 p-3 rounded-lg bg-red-900/40 border border-red-500/40"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-red-300 font-bold text-sm flex items-center space-x-2">
                              <Zap size={14} className="animate-pulse" />
                              <span>{node.attack_info.attack_type}</span>
                            </span>
                            <span className="text-red-400 text-xs font-mono">
                              {Math.round(node.attack_info.elapsed_seconds || 0)}s elapsed
                            </span>
                          </div>
                          {node.attack_info.indicators && (
                            <div className="space-y-1">
                              {node.attack_info.indicators.map((ind, i) => (
                                <div key={i} className="text-xs text-red-300/80 flex items-center space-x-1">
                                  <span className="text-red-500">▸</span>
                                  <span>{ind}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}

                      <div className="flex justify-between text-sm text-gray-300 mt-2 bg-black/30 p-2 rounded">
                        <div>Risk: <span className={isHighRisk || isUnderAttack ? 'text-red-400 font-bold' : 'text-green-400'}>{node.risk_score}/100</span></div>
                        <div>CPU: {node.metrics?.cpu || 0}%</div>
                        <div>RAM: {node.metrics?.mem || 0}%</div>
                      </div>

                      {/* Command Status UI */}
                      {cStatus && (
                        <div className={`mt-3 p-2 rounded text-xs flex items-center justify-between ${
                          cStatus.status === 'executing' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300' :
                          cStatus.status === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-300' :
                          'bg-red-500/20 border border-red-500/30 text-red-300'
                        }`}>
                          <div className="flex items-center space-x-2">
                            {cStatus.status === 'executing' && <Activity className="w-3 h-3 animate-spin" />}
                            {cStatus.status === 'success' && <CheckCircle className="w-3 h-3" />}
                            {cStatus.status === 'failed' && <XCircle className="w-3 h-3" />}
                            <span className="font-mono uppercase">{cStatus.status}</span>
                          </div>
                          <span className="truncate ml-2 text-gray-400">{cStatus.detail}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {isRemote && !cStatus && (
                        <div className="mt-3 flex justify-end space-x-2">
                          {isUnderAttack ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); neutralize(node.node_id); }}
                              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded shadow-lg shadow-green-500/20 transition-all flex items-center space-x-2"
                            >
                              <Shield size={14} />
                              <span>Neutralize Threat</span>
                            </button>
                          ) : (
                            <div className="relative">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setAttackMenu(attackMenu === node.node_id ? null : node.node_id); }}
                                className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded shadow-lg shadow-red-500/20 transition-all flex items-center space-x-2"
                              >
                                <Zap size={14} />
                                <span>Launch Attack Sim</span>
                              </button>
                              {/* Attack Type Dropdown */}
                              {attackMenu === node.node_id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
                                >
                                  {ATTACK_TYPES.map(atk => (
                                    <button
                                      key={atk.id}
                                      onClick={(e) => { e.stopPropagation(); launchAttack(node.node_id, atk.id); }}
                                      className="w-full px-3 py-2 text-left text-xs text-gray-200 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center space-x-2"
                                    >
                                      <Zap size={12} className="text-red-400" />
                                      <span>{atk.label}</span>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Col: Drill-down & Identity */}
        <div className="lg:col-span-1">
           {selectedNode ? (
              <div className={`bg-gray-900 border rounded-xl p-5 sticky top-24 ${
                selectedNode.attack_info ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-gray-800'
              }`}>
                <h2 className="text-xl font-semibold text-white border-b border-gray-800 pb-3 mb-4 flex items-center justify-between">
                  <span>Node Profile</span>
                  <span className="text-xs font-mono text-gray-500">{selectedNode.node_id}</span>
                </h2>
                
                {/* Attack Alert Panel */}
                {selectedNode.attack_info && (
                  <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-500/40">
                    <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center space-x-2">
                      <ShieldAlert size={16} className="animate-pulse" />
                      <span>ACTIVE THREAT DETECTED</span>
                    </h4>
                    <div className="text-sm text-red-300 font-mono mb-2">
                      {selectedNode.attack_info.attack_type}
                    </div>
                    <div className="text-xs text-gray-400 mb-3">
                      Duration: {Math.round(selectedNode.attack_info.elapsed_seconds || 0)}s | 
                      Risk: {selectedNode.attack_info.risk_score}/100
                    </div>
                    {selectedNode.attack_info.indicators && (
                      <div className="space-y-1 mb-3">
                        {selectedNode.attack_info.indicators.map((ind, i) => (
                          <div key={i} className="text-xs text-red-300/70">▸ {ind}</div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => neutralize(selectedNode.node_id)}
                      className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded transition-all flex items-center justify-center space-x-2"
                    >
                      <Shield size={16} />
                      <span>NEUTRALIZE NOW</span>
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Identity Mapping</h4>
                    {(() => {
                      const ident = getNodeIdentity(selectedNode.node_id);
                      if (ident) {
                        return (
                          <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Users className="w-8 h-8 text-indigo-400" />
                              <div>
                                <div className="text-white font-medium">{ident.username}</div>
                                <div className="text-xs text-gray-400">Role: {ident.role}</div>
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs ${ident.risk_score > 50 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                              Risk: {ident.risk_score}
                            </div>
                          </div>
                        );
                      }
                      return <div className="text-sm text-gray-500 italic">No direct identity bounded. Using SYSTEM.</div>
                    })()}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Available Remediation</h4>
                    <div className="space-y-2">
                       <button 
                          onClick={() => dispatchCommand(selectedNode.node_id, 'isolate_node')}
                          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                        >
                          Isolate Node
                       </button>
                       <button 
                          onClick={() => dispatchCommand(selectedNode.node_id, 'block_ip')}
                          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                        >
                          Push Firewall Rules
                       </button>
                       <button 
                          onClick={() => dispatchCommand(selectedNode.node_id, 'kill_process')}
                          className="w-full py-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-sm rounded transition-colors"
                        >
                          Kill Malicious Process
                       </button>
                    </div>
                  </div>
                </div>
              </div>
           ) : (
              <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-xl p-8 text-center sticky top-24">
                 <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                 <h3 className="text-gray-300 font-medium mb-1">No Node Selected</h3>
                 <p className="text-sm text-gray-500">Select an agent from the fleet to view its identity profile and remediation options.</p>
              </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default Fleet;
