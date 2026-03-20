import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Activity, Server, Users, Terminal, CheckCircle, XCircle } from 'lucide-react';
import { wsService } from '../services/api';

const Fleet = () => {
  const [fleetNodes, setFleetNodes] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [commandStatus, setCommandStatus] = useState({}); // node_id -> { status: 'executing'|'success'|'failed', detail: '' }
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    // Subscribe to Fleet and Identity Channels
    const unsubFleet = wsService.subscribe('FLEET', (data) => {
      if (Array.isArray(data)) setFleetNodes(data);
    });

    const unsubIdentity = wsService.subscribe('IDENTITY', (data) => {
      if (Array.isArray(data)) setIdentities(data);
    });

    // Subscribe to Command Updates
    const unsubCommands = wsService.subscribe('COMMAND_UPDATES', (data) => {
      if (data && data.node_id) {
        setCommandStatus(prev => ({
          ...prev,
          [data.node_id]: { 
            status: data.status, 
            detail: data.detail || '',
            timestamp: Date.now()
          }
        }));
        
        // Auto-clear success/fail after 5 seconds
        if (data.status === 'success' || data.status === 'failed') {
          setTimeout(() => {
            setCommandStatus(prev => {
              const updated = { ...prev };
              if (updated[data.node_id]?.timestamp <= Date.now() - 4000) {
                 delete updated[data.node_id];
              }
              return updated;
            });
          }, 5000);
        }
      }
    });

    return () => {
      unsubFleet();
      unsubIdentity();
      unsubCommands();
    };
  }, []);

  const handlePatch = async (nodeId, action) => {
    if (!window.confirm(`Are you sure you want to execute [${action}] on node ${nodeId}?`)) return;

    // Optimistic UI update
    setCommandStatus(prev => ({
      ...prev,
      [nodeId]: { status: 'executing', detail: 'Dispatching command...' }
    }));

    try {
      const res = await fetch('http://localhost:8000/api/fleet/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, action })
      });
      
      if (!res.ok) {
        throw new Error('Failed to dispatch command');
      }
      
      // The actual success/fail will come via the COMMAND_UPDATES websocket channel
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

  const getNodeIdentity = (nodeId) => {
    // simplistic mapping: assumption that node hostname relates to identity or we just show top identities
    // If the system generates an identity for 'Node-Client' we link it here
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
                  const isHighRisk = node.risk_score > 60;
                  const isDegraded = node.status === 'degraded' || node.status === 'offline';
                  const cStatus = commandStatus[node.node_id];

                  return (
                    <motion.div
                      key={node.node_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedNode(node)}
                      className={`relative p-5 rounded-xl border transition-all cursor-pointer ${
                        selectedNode?.node_id === node.node_id ? 'ring-2 ring-cyan-500 bg-gray-800' : 'bg-gray-900 hover:bg-gray-800'
                      } ${isHighRisk ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-gray-800'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${isHighRisk ? 'bg-red-500/20 text-red-500' : 'bg-cyan-500/20 text-cyan-400'}`}>
                            {isHighRisk ? <ShieldAlert size={20} /> : <Server size={20} />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{node.hostname}</h3>
                            <p className="text-xs text-gray-400 font-mono">{node.node_id}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          node.status === 'nominal' ? 'bg-green-500/20 text-green-400' :
                          isDegraded ? 'bg-gray-500/20 text-gray-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {node.status}
                        </div>
                      </div>

                      <div className="flex justify-between text-sm text-gray-300 mt-4 bg-black/30 p-2 rounded">
                        <div>Risk: <span className={isHighRisk ? 'text-red-400 font-bold' : 'text-green-400'}>{node.risk_score}/100</span></div>
                        <div>CPU: {node.metrics?.cpu || 0}%</div>
                        <div>RAM: {node.metrics?.mem || 0}%</div>
                      </div>

                      {/* Command Status UI */}
                      {cStatus && (
                        <div className={`mt-4 p-2 rounded text-xs flex items-center justify-between ${
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

                      {/* 1-Click Patch Button */}
                      {isHighRisk && !cStatus && (
                         <div className="mt-4 flex justify-end">
                           <button 
                              onClick={(e) => { e.stopPropagation(); handlePatch(node.node_id, 'isolate_node') }}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded shadow-lg shadow-red-500/20 transition-all flex items-center space-x-2"
                            >
                              <Terminal size={14} />
                              <span>1-Click Patch & Fix</span>
                           </button>
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
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sticky top-24">
                <h2 className="text-xl font-semibold text-white border-b border-gray-800 pb-3 mb-4 flex items-center justify-between">
                  <span>Node Profile</span>
                  <span className="text-xs font-mono text-gray-500">{selectedNode.node_id}</span>
                </h2>
                
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
                          onClick={() => handlePatch(selectedNode.node_id, 'isolate_node')}
                          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                        >
                          Isolate Node
                       </button>
                       <button 
                          onClick={() => handlePatch(selectedNode.node_id, 'block_ip')}
                          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                        >
                          Push Firewall Rules
                       </button>
                       <button 
                          onClick={() => handlePatch(selectedNode.node_id, 'kill_process')}
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
