import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Brain, Shield, Zap, Terminal, Sparkles, MessageSquare } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';

const API_BASE = '/api';

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} style={{ margin: '6px 0', paddingLeft: '16px', listStyle: 'disc' }}>
          {listItems.map((item, i) => <li key={i} style={{ marginBottom: '3px' }}>{formatInline(item)}</li>)}
        </ul>
      );
      listItems = [];
    }
  };

  const formatInline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#22D3EE', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return <code key={`${i}-${j}`} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>{cp.slice(1, -1)}</code>;
        }
        return cp;
      });
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.match(/^\d+\.\s/)) {
      listItems.push(trimmed.replace(/^[-•]\s|^\d+\.\s/, ''));
      return;
    }
    flushList();
    if (!trimmed) { elements.push(<div key={idx} style={{ height: '6px' }} />); return; }
    if (trimmed.startsWith('### ')) {
      elements.push(<div key={idx} style={{ fontWeight: 800, fontSize: '12px', marginTop: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#22D3EE' }}>{trimmed.slice(4)}</div>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<div key={idx} style={{ fontWeight: 800, fontSize: '14px', marginTop: '10px', marginBottom: '4px', color: 'white' }}>{trimmed.slice(3)}</div>);
      return;
    }
    elements.push(<div key={idx} style={{ marginBottom: '3px' }}>{formatInline(trimmed)}</div>);
  });
  flushList();
  return elements;
}

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'AEGIS Neural Core online. Ready for security analysis. How can I assist you?', time: new Date() }
  ]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory]);

  useEffect(() => {
    fetch(`${API_BASE}/ai/status`).then(r => r.json()).then(setAiStatus).catch(() => setAiStatus(null));
  }, []);

  const { data: chatEvent, sendMessage: wsSend, isConnected } = useAegisSocket('AI_CHAT', 0);

  useEffect(() => {
    if (!chatEvent) return;
    const { event, token, mode, error, done } = chatEvent;
    if (event === 'meta') {
      setChatHistory(prev => { const u = [...prev]; const l = u.length - 1; if (l >= 0 && u[l].streaming) u[l] = { ...u[l], mode }; return u; });
    } else if (event === 'token') {
      setChatHistory(prev => { const u = [...prev]; const l = u.length - 1; if (l >= 0 && u[l].streaming) u[l] = { ...u[l], text: u[l].text + token }; return u; });
    } else if (event === 'error') {
      setIsStreaming(false);
      setChatHistory(prev => [...prev, { role: 'assistant', text: `Connection to the Neural Core lost. Error: ${error}`, time: new Date(), mode: 'error' }]);
    } else if (event === 'done' || done) {
      setIsStreaming(false);
      setChatHistory(prev => { const u = [...prev]; const l = u.length - 1; if (l >= 0 && u[l].streaming) u[l] = { ...u[l], streaming: false }; return u; });
    }
  }, [chatEvent]);

  const { data: decisionEvent } = useAegisSocket('AI_DECISIONS');
  useEffect(() => {
    if (!decisionEvent) return;
    const actionType = decisionEvent.auto_executed ? '⚡ AUTONOMOUS ACTION EXECUTED' : '💡 RECOMMENDED PROTOCOL';
    let content = `### ${actionType}: **${decisionEvent.action}**\n`;
    content += `- **Target:** \`${decisionEvent.target}\`\n`;
    content += `- **Confidence:** ${Math.round(decisionEvent.confidence * 100)}%\n`;
    if (decisionEvent.mitigation_result) {
      const mStatus = decisionEvent.mitigation_result.success ? "✅ SUCCESS" : "❌ FAILED";
      content += `- **Mitigation:** ${mStatus} — ${decisionEvent.mitigation_result.detail}\n`;
    }
    if (decisionEvent.forensics_result) {
      content += `- **Forensics:** 🔍 ${decisionEvent.forensics_result}\n`;
    }
    content += `- **Trigger Evidence:**\n`;
    content += decisionEvent.evidence.map(e => `  - ${e}`).join('\n') + '\n';
    setChatHistory(prev => [...prev, { role: 'assistant', text: content, time: new Date(), mode: 'decision' }]);
  }, [decisionEvent]);

  const handleStreamChat = useCallback((query) => {
    if (!isConnected) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: 'System offline. Waiting for real-time connection...', time: new Date(), mode: 'error' }]);
      return;
    }
    setIsStreaming(true);
    setChatHistory(prev => [...prev, { role: 'assistant', text: '', time: new Date(), streaming: true }]);
    wsSend({ query, session_id: sessionId });
  }, [isConnected, wsSend, sessionId]);

  const handleSend = useCallback(() => {
    if (!message.trim() || isStreaming) return;
    setChatHistory(prev => [...prev, { role: 'user', text: message.trim(), time: new Date() }]);
    const q = message.trim();
    setMessage('');
    handleStreamChat(q);
  }, [message, isStreaming, handleStreamChat]);

  const quickActions = [
    { label: '🛡 System Status', query: 'What is the current system security status?' },
    { label: '🔍 Exposed Ports', query: 'Are there any exposed ports or services?' },
    { label: '📊 Risk Analysis', query: 'Analyze my current risk score and explain the factors' },
    { label: '⚠️ Active Threats', query: 'Are there any active threats or incidents?' },
  ];

  const isLLM = aiStatus?.llm?.connected;
  const statusColor = isLLM ? '#10B981' : '#F59E0B';
  const statusText = isLLM ? 'LLM Connected' : 'Fallback Mode';
  const modelName = isLLM ? aiStatus?.llm?.model : 'Rule Engine';

  return (
    <div className="flex flex-col h-full bg-[#111827] border border-[#22D3EE]/30 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.08)] overflow-hidden">
       
       {/* Title Bar */}
       <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#22D3EE]/5 to-[#3B82F6]/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 flex items-center justify-center border border-[#22D3EE]/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                 <Brain className="w-5 h-5 text-[#22D3EE]" />
              </div>
              <div>
                 <h3 className="text-sm font-black uppercase tracking-wider text-white">AEGIS Neural Core</h3>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: statusColor }}>
                      {statusText}
                    </span>
                    <span className="text-xs font-mono text-[#6B7280]">• {modelName}</span>
                 </div>
              </div>
            </div>
          </div>
       </div>

       {/* Messages Area */}
       <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user' 
                ? 'bg-[#22D3EE] text-black font-semibold rounded-2xl rounded-tr-sm shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                : 'bg-[#0B0F1A] border border-white/10 text-[#9CA3AF] rounded-2xl rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                    <Shield className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#22D3EE]">Aegis Brain</span>
                    {msg.mode === 'ai' && <Zap className="w-3.5 h-3.5 text-[#10B981] ml-auto" title="LLM Response" />}
                    {msg.streaming && <span className="ml-auto w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />}
                  </div>
                )}
                <div className="font-mono text-sm">
                  {msg.role === 'assistant' ? renderMarkdown(msg.text) : msg.text}
                </div>
                {msg.streaming && !msg.text && (
                  <div className="flex gap-1.5 py-2">
                    <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
       </div>

       {/* Quick Actions */}
       {chatHistory.length <= 2 && (
         <div className="px-4 pb-3">
           <div className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">Quick Analysis</div>
           <div className="flex flex-wrap gap-2">
             {quickActions.map(({ label, query }) => (
               <button
                 key={label}
                 onClick={() => {
                   setChatHistory(prev => [...prev, { role: 'user', text: query, time: new Date() }]);
                   handleStreamChat(query);
                 }}
                 disabled={isStreaming}
                 className="px-3 py-2 rounded-lg bg-[#0B0F1A] border border-white/10 text-xs font-bold text-[#9CA3AF] hover:text-white hover:bg-white/10 hover:border-[#22D3EE]/30 transition-all disabled:opacity-40"
               >
                 {label}
               </button>
             ))}
           </div>
         </div>
       )}

       {/* Input Area */}
       <div className="p-4 bg-[#0B0F1A] border-t border-white/10 shrink-0">
          <div className="relative group">
            <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] group-focus-within:text-[#22D3EE] transition-colors" />
            <input 
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isStreaming ? "Analyzing..." : "Ask about security, threats, network..."}
              disabled={isStreaming}
              className="w-full bg-[#111827] border border-white/10 rounded-xl py-3 pl-12 pr-14 text-sm text-white focus:outline-none focus:border-[#22D3EE]/40 focus:ring-1 focus:ring-[#22D3EE]/20 transition-all placeholder:text-[#6B7280] disabled:opacity-60"
            />
            <button 
              onClick={handleSend}
              disabled={isStreaming || !message.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-[#22D3EE] text-black font-bold hover:bg-[#06b6d4] active:scale-95 disabled:opacity-40 transition-all shadow-[0_0_12px_rgba(34,211,238,0.3)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
              <span className="font-bold uppercase tracking-wider">{modelName}</span>
            </div>
            <span className="font-mono">
              {aiStatus?.memory?.patterns_count || '—'} patterns • {aiStatus?.memory?.incidents_count || '0'} incidents
            </span>
          </div>
       </div>
    </div>
  );
}
