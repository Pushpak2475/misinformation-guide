/**
 * RefreshStatusBar.tsx
 *
 * A slim, persistent status bar displayed at the top of every data page.
 * Shows:
 *  - A live countdown ring until the next auto-refresh
 *  - "Refreshing…" spinner when active
 *  - Last-updated timestamp
 *  - A manual "Refresh now" button
 *  - A progress bar that depletes as the countdown ticks down
 */

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Clock, Wifi } from 'lucide-react';
import { formatCountdown, AUTO_REFRESH_INTERVAL_MS } from '../../hooks/useAutoRefresh';

interface Props {
  secondsLeft: number;
  isRefreshing: boolean;
  lastRefreshed: string;
  onRefreshNow: () => void;
  /** Additional label, e.g. "Fetching 14 India sources…" */
  statusLabel?: string;
}

export default function RefreshStatusBar({
  secondsLeft,
  isRefreshing,
  lastRefreshed,
  onRefreshNow,
  statusLabel,
}: Props) {
  const totalSeconds = AUTO_REFRESH_INTERVAL_MS / 1000;
  const progressPct = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  return (
    <div className="glass-card !p-0 mb-5 overflow-hidden">
      {/* Progress bar — fills as we approach next refresh */}
      <div className="h-0.5 w-full bg-white/5 relative">
        <motion.div
          className="absolute left-0 top-0 h-full"
          style={{ background: 'linear-gradient(90deg, #00d4ff, #7c3aed)' }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
        {/* Status indicator */}
        <AnimatePresence mode="wait">
          {isRefreshing ? (
            <motion.div
              key="refreshing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 text-primary text-xs font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{statusLabel ?? 'Fetching latest news & verifying…'}</span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-slate-400"
            >
              {/* Live pulsing dot */}
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <span className="hidden sm:inline">Auto-refresh in</span>
              <span className="font-mono font-bold text-white">{formatCountdown(secondsLeft)}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live timestamp */}
        {lastRefreshed && (
          <span className="text-xs text-slate-500 flex items-center gap-1 ml-1">
            <Clock className="w-3 h-3" />
            Last: {lastRefreshed}
          </span>
        )}

        {/* Source count badge */}
        <span className="text-xs text-slate-600 flex items-center gap-1 hidden md:flex">
          <Wifi className="w-3 h-3" />
          <span>5 min interval</span>
        </span>

        {/* Refresh now button */}
        <button
          onClick={onRefreshNow}
          disabled={isRefreshing}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh now'}</span>
        </button>
      </div>
    </div>
  );
}
