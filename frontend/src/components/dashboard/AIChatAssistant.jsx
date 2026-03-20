import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, Terminal, Shield, Zap, Cpu, Brain, Wifi, WifiOff, ChevronDown, Sparkles } from 'lucide-react';
import { useAegisSocket } from '../../services/useAegisSocket';

const API_BASE = '/api';

// ---------------------------------------------------------------------------
// Markdown-lite renderer for AI responses
// ---------------------------------------------------------------------------
function renderMarkdown(text) {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null;
  
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
    // Bold: **text**
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      // Inline code: `text`
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return <code key={`${i}-${j}`} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>{cp.slice(1, -1)}</code>;
        }
        return cp;
      });
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // Bullet points  
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.match(/^\d+\.\s/)) {
      const content = trimmed.replace(/^[-•]\s|^\d+\.\s/, '');
      listItems.push(content);
      return;
    }
    
    flushList();
    
    if (!trimmed) {
      elements.push(<div key={idx} style={{ height: '6px' }} />);
      return;
    }
    
    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(<div key={idx} style={{ fontWeight: 800, fontSize: '11px', marginTop: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-accent)' }}>{trimmed.slice(4)}</div>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<div key={idx} style={{ fontWeight: 800, fontSize: '12px', marginTop: '10px', marginBottom: '4px', color: 'white' }}>{trimmed.slice(3)}</div>);
      return;
    }

    elements.push(<div key={idx} style={{ marginBottom: '3px' }}>{formatInline(trimmed)}</div>);
  });
  
  flushList();
  return elements;
}

// ---------------------------------------------------------------------------
// Main Chat Component
// ---------------------------------------------------------------------------
export default function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'AEGIS Neural Core online. Ready for security analysis. How can I assist you?', time: new Date() }
  ]);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen]);

  // Fetch AI status when chat opens
  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE}/ai/status`)
        .then(res => res.json())
        .then(data => setAiStatus(data))
        .catch(() => setAiStatus(null));
    }
  }, [isOpen]);

  // WebSocket connection for real-time chat
  const { data: chatEvent, sendMessage, isConnected: isWsConnected } = useAegisSocket('AI_CHAT', 0); // 0 debounce for instant tokens

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!chatEvent) return;

    const { event, token, mode, error, done } = chatEvent;

    if (event === 'meta') {
      setChatHistory(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].streaming) {
          updated[lastIdx] = { ...updated[lastIdx], mode };
        }
        return updated;
      });
    } else if (event === 'token') {
      setChatHistory(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].streaming) {
          updated[lastIdx] = { ...updated[lastIdx], text: updated[lastIdx].text + token };
        }
        return updated;
      });
    } else if (event === 'error') {
      setIsStreaming(false);
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', text: `Connection to the Neural Core lost. Error: ${error}`, time: new Date(), mode: 'error' }
      ]);
    } else if (event === 'done' || done) {
      setIsStreaming(false);
      setChatHistory(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].streaming) {
          updated[lastIdx] = { ...updated[lastIdx], streaming: false };
        }
        return updated;
      });
    }
  }, [chatEvent]);

  // Handle incoming Autonomous AI Decisions
  const { data: decisionEvent } = useAegisSocket('AI_DECISIONS');
  
  useEffect(() => {
    if (!decisionEvent) return;
    
    // Auto-open chat if a high/critical decision is made
    if (decisionEvent.severity === 'critical' || decisionEvent.severity === 'high') {
       if (!isOpen) setIsOpen(true);
    }
    
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

    setChatHistory(prev => [
      ...prev,
      { role: 'assistant', text: content, time: new Date(), mode: 'decision' }
    ]);
  }, [decisionEvent, isOpen]);

  // ---------------------------------------------------------------------------
  // Streaming Chat Handler (WebSocket)
  // ---------------------------------------------------------------------------
  const handleStreamChat = useCallback((query) => {
    if (!isWsConnected) {
      // Fallback message if WS is down
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', text: 'System offline. Waiting for real-time connection...', time: new Date(), mode: 'error' }
      ]);
      return;
    }

    setIsStreaming(true);
    
    // Add placeholder for assistant response
    setChatHistory(prev => [...prev, { role: 'assistant', text: '', time: new Date(), streaming: true }]);

    // Send query over active WebSocket
    sendMessage({ query, session_id: sessionId });
  }, [isWsConnected, sendMessage, sessionId]);

  // ---------------------------------------------------------------------------
  // Send Handler
  // ---------------------------------------------------------------------------
  const handleSend = useCallback(() => {
    if (!message.trim() || isStreaming) return;
    
    const userMsg = { role: 'user', text: message.trim(), time: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    
    const query = message.trim();
    setMessage('');
    handleStreamChat(query);
  }, [message, isStreaming, handleStreamChat]);

  // Quick action chips
  const quickActions = [
    { label: 'System Status', query: 'What is the current system security status?' },
    { label: 'Exposed Ports', query: 'Are there any exposed ports or services?' },
    { label: 'Risk Analysis', query: 'Analyze my current risk score and explain the factors' },
    { label: 'Active Threats', query: 'Are there any active threats or incidents?' },
  ];

  const isLLM = aiStatus?.llm?.connected;
  const statusColor = isLLM ? 'var(--color-success)' : '#f59e0b';
  const statusText = isLLM ? 'LLM Connected' : 'Fallback Mode';
  const modelName = isLLM ? aiStatus?.llm?.model : 'Rule Engine';

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-[0_8px_30px_rgba(59,130,246,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
         <div className="absolute -top-12 right-0 bg-black/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-blue-400" />
              AEGIS Neural Core
            </div>
         </div>
         <Brain className="w-8 h-8" />
         <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-[3px] border-[#0a0a12] flex items-center justify-center" style={{ background: statusColor }}>
           <Sparkles className="w-2.5 h-2.5 text-white" />
         </span>
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-8 right-8 w-[440px] h-[650px] bg-[#0c0c18]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.7)] flex flex-col z-[60] overflow-hidden transition-all duration-500 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
         
         {/* Title Bar */}
         <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-r from-blue-500/[0.03] to-purple-500/[0.03]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/20">
                   <Brain className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                   <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white">AEGIS Neural Core</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor }} />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: statusColor }}>
                        {statusText}
                      </span>
                      <span className="text-[9px] font-mono text-gray-600">• {modelName}</span>
                   </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-xl hover:bg-white/5 transition-all text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
         </div>

         {/* Messages Area */}
         <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] px-4 py-3 text-[12px] leading-[1.65] ${
                  msg.role === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-sm shadow-lg shadow-blue-500/20' 
                  : 'bg-white/[0.04] border border-white/[0.06] text-gray-300 rounded-2xl rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/5">
                      <Shield className="w-3 h-3 text-blue-400" />
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-400/70">Aegis_Brain</span>
                      {msg.mode === 'ai' && <Zap className="w-3 h-3 text-green-400 ml-auto" title="LLM Response" />}
                      {msg.streaming && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                    </div>
                  )}
                  <div className="font-mono">
                    {msg.role === 'assistant' ? renderMarkdown(msg.text) : msg.text}
                  </div>
                  {msg.streaming && !msg.text && (
                    <div className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
         </div>

         {/* Quick Actions */}
         {chatHistory.length <= 2 && (
           <div className="px-5 pb-2">
             <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Quick Analysis</div>
             <div className="flex flex-wrap gap-1.5">
               {quickActions.map(({ label, query }) => (
                 <button
                   key={label}
                   onClick={() => {
                     const userMsg = { role: 'user', text: query, time: new Date() };
                     setChatHistory(prev => [...prev, userMsg]);
                     handleStreamChat(query);
                   }}
                   disabled={isStreaming}
                   className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/[0.08] hover:border-blue-500/30 transition-all disabled:opacity-40"
                 >
                   {label}
                 </button>
               ))}
             </div>
           </div>
         )}

         {/* Input Area */}
         <div className="p-5 bg-black/30 border-t border-white/5">
            <div className="relative group">
              <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isStreaming ? "Analyzing..." : "Ask about security, threats, network..."}
                disabled={isStreaming}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-12 pr-14 text-[12px] focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-600 disabled:opacity-60"
              />
              <button 
                onClick={handleSend}
                disabled={isStreaming || !message.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-lg shadow-blue-500/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-[9px] text-gray-600">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                <span className="font-bold uppercase tracking-widest">{modelName}</span>
              </div>
              <span className="font-mono">
                {aiStatus?.memory?.patterns_count || '—'} patterns • {aiStatus?.memory?.incidents_count || '0'} incidents
              </span>
            </div>
         </div>
      </div>
    </>
  );
}
