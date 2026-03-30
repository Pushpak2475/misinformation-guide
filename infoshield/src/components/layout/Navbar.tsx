import { Search, RefreshCw, Wifi, Menu } from 'lucide-react';
import { useState } from 'react';
import NotificationPanel from './NotificationPanel';

interface NavbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export default function Navbar({ title, subtitle, onMenuClick }: NavbarProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
    window.dispatchEvent(new CustomEvent('infoshield:refresh'));
  };

  return (
    <header className="h-14 md:h-16 flex items-center gap-3 md:gap-4 px-4 md:px-6 border-b border-white/5 glass-dark z-30 relative flex-shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-xl hover:bg-white/8 transition-colors flex-shrink-0 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5 text-slate-400" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-base md:text-lg font-bold text-white leading-none truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
      </div>

      {/* Search — hidden on small screens */}
      <div className="relative hidden md:flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search articles, claims..."
          className="input-glass pl-10 pr-4 py-2 w-56 lg:w-64 text-sm"
        />
      </div>

      {/* Live indicator — hidden on very small screens */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 flex-shrink-0">
        <Wifi className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span className="text-xs text-primary font-medium">Live</span>
      </div>

      {/* Refresh */}
      <button
        onClick={handleRefresh}
        className="p-2 rounded-xl hover:bg-white/8 transition-colors flex-shrink-0"
        title="Refresh data"
      >
        <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
      </button>

      {/* Notifications — live dropdown */}
      <NotificationPanel />
    </header>
  );
}
