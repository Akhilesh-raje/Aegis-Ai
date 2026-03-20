import React, { useState, useEffect, useRef } from 'react';
import extremeTestService from '../services/extremeTestService';
import { useAegisSocket } from '../services/useAegisSocket';

const WarRoom = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [results, setResults] = useState({});
  const [logs, setLogs] = useState([]);
  const [finalReport, setFinalReport] = useState(null);
  const logEndRef = useRef(null);

  const PHASES = [
    "Load Stress",
    "Adversarial Attack",
    "Chaos Engineering",
    "AI Reasoning",
    "Autonomy Safety",
    "Swarm Consensus",
    "Realistic APT",
    "Long Run Test",
    "Edge Case Testing"
  ];

  const { data: statusData } = useAegisSocket('WAR_ROOM_STATUS', 0);
  const { data: logData } = useAegisSocket('WAR_ROOM_LOGS', 0);
  const { data: finalData } = useAegisSocket('WAR_ROOM_FINAL', 0);

  useEffect(() => {
    if (statusData) {
      setCurrentPhase(statusData.current_phase);
      setResults(statusData.all_results);
    }
  }, [statusData]);

  useEffect(() => {
    if (logData) {
      setLogs(prev => [...prev, logData].slice(-100));
    }
  }, [logData]);

  useEffect(() => {
    if (finalData) {
      setFinalReport(finalData);
      setIsRunning(false);
    }
  }, [finalData]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartWarMode = async () => {
    try {
      setIsRunning(true);
      setResults({});
      setLogs([]);
      setFinalReport(null);
      await extremeTestService.runSuite();
    } catch (err) {
      setIsRunning(false);
      alert("Failed to initiate War Mode.");
    }
  };

  return (
    <div className="war-room-container" style={{ padding: '2rem', color: '#fff', background: '#0a0a0c', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(90deg, #ff3e3e, #ff8a00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ELITE WAR ROOM
          </h1>
          <p style={{ color: '#888' }}>Autonomous System Stress & Resilience Testing Center</p>
        </div>
        <button 
          onClick={handleStartWarMode}
          disabled={isRunning}
          style={{
            padding: '1rem 2rem',
            background: isRunning ? '#333' : 'linear-gradient(135deg, #ff3e3e 0%, #a30000 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 'bold',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            boxShadow: isRunning ? 'none' : '0 0 20px rgba(255, 62, 62, 0.4)',
            transition: 'all 0.3s ease'
          }}
        >
          {isRunning ? 'WAR MODE ACTIVE' : 'INITIALIZE WAR MODE'}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Progress Tracker */}
        <div style={{ background: '#141417', borderRadius: '12px', padding: '1.5rem', border: '1px solid #333' }}>
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Mission Progress</h3>
          {PHASES.map((phase, idx) => {
            const res = results[phase] || { status: 'pending', score: 0 };
            const isActive = currentPhase === idx + 1;
            return (
              <div key={phase} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem',
                padding: '1rem',
                borderRadius: '8px',
                background: isActive ? 'rgba(255, 62, 62, 0.1)' : 'transparent',
                border: isActive ? '1px solid #ff3e3e' : '1px solid transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '12px',
                    background: res.status === 'completed' ? '#4ade80' : isActive ? '#ff3e3e' : '#333'
                  }}>
                    {res.status === 'completed' ? '✓' : idx + 1}
                  </span>
                  <span style={{ color: isActive ? '#fff' : '#888', fontWeight: isActive ? 'bold' : 'normal' }}>{phase}</span>
                </div>
                {res.status === 'completed' && (
                  <span style={{ color: res.score >= 90 ? '#4ade80' : '#facc15' }}>{res.score}%</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Logs */}
        <div style={{ background: '#000', borderRadius: '12px', padding: '1rem', border: '1px solid #333', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30px', background: '#222', display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '12px', color: '#888' }}>
            <span>TERMINAL OUTPUT — LIVE STREAM</span>
          </div>
          <div style={{ marginTop: '30px', height: '500px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '14px', padding: '1rem' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '4px', color: log.type === 'error' ? '#ff4d4d' : log.type === 'success' ? '#4ade80' : log.type === 'header' ? '#a855f7' : '#ccc' }}>
                <span style={{ color: '#555' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Final Scorecard Modal */}
      {finalReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1a1a1e', padding: '3rem', borderRadius: '20px', textAlign: 'center', maxWidth: '600px', width: '90%', border: '2px solid #ff3e3e' }}>
            <h2 style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>{finalReport.overall.toFixed(1)}%</h2>
            <h3 style={{ color: '#888', marginBottom: '2rem' }}>OVERALL SYSTEM RESILIENCE</h3>
            <div style={{ fontSize: '1.2rem', marginBottom: '2.5rem', color: finalReport.overall >= 90 ? '#4ade80' : '#facc15' }}>
              {finalReport.overall >= 90 ? '✅ ELITE DEFENSE STATUS ACHIEVED' : '⚠️ SYSTEM HARDENING RECOMMENDED'}
            </div>
            <button 
              onClick={() => setFinalReport(null)}
              style={{ padding: '1rem 3rem', background: '#333', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
            >
              CLOSE DEBRIEF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarRoom;
