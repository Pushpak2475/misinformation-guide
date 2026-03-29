import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, Shield, Settings, LogOut,
  Activity, Globe, AlertTriangle, ChevronRight, Zap, LogIn, UserPlus,
  BookOpen, Database, MessageSquare, GitBranch,
} from 'lucide-react';
import { getSession, logout } from '../../services/authService';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/check-news', icon: Search,           label: 'Check News' },
  { to: '/news-hub',   icon: BookOpen,         label: 'News Hub' },
  { to: '/admin',      icon: Settings,         label: 'Admin Panel' },
];

const intelligenceItems = [
  { to: '/sources',      icon: Database,       label: 'Data Sources',   badge: '9 src' },
  { to: '/counter-post', icon: MessageSquare,  label: 'Counter Post',   badge: 'AI' },
  { to: '/truth-trace',  icon: GitBranch,      label: 'Truth Trace',    badge: '🧬' },
];

const sourceItems = [
  { to: '/rss-feeds',     icon: Globe,         label: 'RSS Feeds',    badge: '8 src' },
  { to: '/active-alerts', icon: AlertTriangle, label: 'Active Alerts', badge: '🔴 Live' },
  { to: '/live-stream',   icon: Zap,           label: 'Live Stream',  badge: 'ON' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 z-40 flex flex-col glass-dark border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="relative w-9 h-9 flex-shrink-0">
          <div className="absolute inset-0 rounded-xl bg-primary/20 animate-pulse-glow" />
          <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
        </div>
        <div>
          <div className="font-display font-bold text-white text-sm leading-none">InfoShield</div>
          <div className="text-xs text-primary/80 mt-0.5">AI Defense</div>
        </div>
      </div>

      {/* Live status */}
      <div className="mx-4 mt-4 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
        <span className="pulse-dot bg-green-400 after:bg-green-400" />
        <span className="text-xs text-green-400 font-medium">System Online</span>
        <Activity className="w-3 h-3 text-green-400 ml-auto animate-pulse" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-4 mb-2">Main</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
          </NavLink>
        ))}

        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-4 mb-2 mt-6">Intelligence</div>
        {intelligenceItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary/70">{badge}</span>
          </NavLink>
        ))}

        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-4 mb-2 mt-6">Data Sources</div>
        {sourceItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{badge}</span>
          </NavLink>
        ))}

        {/* Auth links if not logged in */}
        {!session && (
          <>
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-4 mb-2 mt-6">Account</div>
            <NavLink to="/login" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <LogIn className="w-4 h-4 flex-shrink-0 text-primary" />
              <span>Sign In</span>
            </NavLink>
            <NavLink to="/signup" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <UserPlus className="w-4 h-4 flex-shrink-0 text-accent-purple" />
              <span>Create Account</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        {session ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/40 to-accent-purple/40 flex items-center justify-center text-xs font-bold text-white">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{session.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{session.email}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="sidebar-link w-full text-slate-500 hover:text-red-400">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => navigate('/login')}
              className="flex-1 py-2 px-3 text-xs text-slate-400 border border-white/10 rounded-xl hover:border-primary/30 hover:text-primary transition-all">
              Sign In
            </button>
            <button onClick={() => navigate('/signup')}
              className="flex-1 py-2 px-3 text-xs font-medium text-white btn-primary">
              Sign Up
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
