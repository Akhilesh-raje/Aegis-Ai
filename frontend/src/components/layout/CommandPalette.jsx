import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, ShieldAlert, Zap, ScrollText, Swords, Settings, Terminal } from 'lucide-react';

const commands = [
  { id: 'dash', label: 'Go to Dashboard', icon: Globe, path: '/' },
  { id: 'net', label: 'Monitor Network', icon: Terminal, path: '/network' },
  { id: 'threat', label: 'Threat Intelligence', icon: ShieldAlert, path: '/threats' },
  { id: 'soar', label: 'Execute Containment (SOAR)', icon: Zap, path: '/soar' },
  { id: 'sim', label: 'Trigger Simulation', icon: Swords, path: '/simulation' },
  { id: 'logs', label: 'View System Logs', icon: ScrollText, path: '/logs' },
  { id: 'settings', label: 'System Settings', icon: Settings, path: '/settings' },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0d162d]/90 border border-[var(--color-border-glow)] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-black/20">
          <Search className="w-5 h-5 text-[var(--color-accent)]" />
          <input
            autoFocus
            type="text"
            placeholder="Search commands, assets, or playbooks (Ctrl+K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-lg focus:outline-none placeholder:text-gray-600 font-[var(--font-mono)]"
          />
          <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 font-bold uppercase">
            ESC
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-20 text-center text-gray-500 text-sm font-bold uppercase tracking-widest opacity-30">
              No matching records identified
            </div>
          ) : (
            filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => {
                  navigate(cmd.path);
                  setIsOpen(false);
                  setQuery('');
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--color-accent)]/10 group transition-all text-left"
              >
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 group-hover:border-[var(--color-accent)]/30 group-hover:text-[var(--color-accent)] transition-all">
                  <cmd.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">{cmd.label}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)] tracking-wider uppercase font-mono">{cmd.path}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))
          )}
        </div>

        <div className="p-3 border-t border-white/5 bg-black/30 flex justify-between items-center px-6">
           <div className="flex items-center gap-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
                 <span className="p-1 rounded bg-white/5 border border-white/10 text-[8px] tracking-tighter">↑↓</span> SELECT
              </span>
              <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
                 <span className="p-1 rounded bg-white/5 border border-white/10 text-[8px] tracking-tighter">ENTER</span> EXECUTE
              </span>
           </div>
           <div className="text-[9px] text-[var(--color-accent)] font-mono opacity-40 uppercase tracking-widest">
              AegisAI_Orchestrator_v1.0
           </div>
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={() => setIsOpen(false)} />
    </div>
  );
}

import { ChevronRight } from 'lucide-react';
