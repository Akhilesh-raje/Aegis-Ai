import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  ShieldAlert,
  Search,
  Zap,
  Swords,
  ScrollText,
  Settings,
  Shield,
  Activity,
  LogOut,
  Flame,
  Server
} from 'lucide-react';
// Auth neutralized for direct specialized access

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/network', icon: Network, label: 'Network Monitor' },
  { to: '/threats', icon: ShieldAlert, label: 'Threat Intelligence' },
  { to: '/investigation', icon: Search, label: 'Incident Investigation' },
  { to: '/fleet', icon: Server, label: 'Fleet & Identities' },
  { to: '/soar', icon: Zap, label: 'SOAR Center' },
  { to: '/simulation', icon: Swords, label: 'Attack Simulation' },
  { to: '/war-room', icon: Flame, label: 'Elite War Room' },
  { to: '/logs', icon: ScrollText, label: 'System Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  // Neutralized auth constant
  const user = { username: 'Analyst', role: 'admin' };
  const logout = () => { window.location.href = '/'; };

  return (
    <aside className="w-[260px] min-w-[260px] h-full bg-[#0b1220] border-r border-white/5 flex flex-col z-50">
      {/* Logo Section */}
      <div className="px-8 pt-8 pb-10">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[#3b82f6] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-transform group-hover:scale-110">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0b1220] border border-white/10 flex items-center justify-center">
               <Activity className="w-2.5 h-2.5 text-[var(--color-accent)] animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="font-[var(--font-display)] text-xl tracking-[0.15em] font-bold leading-tight">
              AEGIS<span className="text-[var(--color-accent)] text-glow">AI</span>
            </h1>
            <span className="text-[8px] font-bold text-[var(--color-text-muted)] tracking-[0.3em] uppercase opacity-60">Command Center</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        <div className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] px-4 mb-4 opacity-50">Main Operations</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-4 px-4 py-3.5 rounded-xl text-[13px] font-medium transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-[0_0_20px_rgba(0,229,255,0.05)]'
                  : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-primary)] border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]' : 'group-hover:text-[var(--color-text-primary)]'}`} />
                <span className="tracking-wide">{label}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-[var(--color-accent)] rounded-r-full shadow-[0_0_10px_var(--color-accent)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Profile / Version */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex flex-col gap-3">
           {user && (
             <div className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-white/5">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded bg-[var(--color-accent)]/20 flex flex-col items-center justify-center">
                      <Shield className="w-4 h-4 text-[var(--color-accent)]" />
                   </div>
                   <div>
                      <div className="text-[10px] font-bold text-[var(--color-text-primary)] tracking-tight">{user.username}</div>
                      <div className="text-[8px] text-[var(--color-accent)] font-mono uppercase tracking-widest">{user.role}</div>
                   </div>
                </div>
                <button onClick={logout} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors" title="Log Out">
                   <LogOut className="w-4 h-4" />
                </button>
             </div>
           )}
           <div className="text-[9px] font-mono text-[var(--color-text-muted)] text-center opacity-40 uppercase tracking-widest leading-relaxed">
             AegisAI Console v1.0.4<br/>Build_Hash: 7D2F9
           </div>
        </div>
      </div>
    </aside>
  );
}
