import { useState, useEffect, useRef, useCallback, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ExternalLink, AlertTriangle, CheckCircle, RefreshCw, BellOff, Zap, TrendingUp, ShieldAlert } from 'lucide-react';
import { fetchAllNews } from '../../services/newsService';
import { classifyText, type Verdict } from '../../services/classifierService';

type AlertType = 'breaking' | 'viral' | 'high-risk' | 'normal';

interface Notification {
  id: string;
  title: string;
  link: string;
  source: string;
  verdict: Verdict;
  confidence: number;
  time: string;
  read: boolean;
  alertType: AlertType;
}

const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; color: string; icon: ElementType }> = {
  breaking:  { label: '🚨 Breaking', color: '#ef4444', icon: Zap },
  viral:     { label: '🔥 Viral',    color: '#f97316', icon: TrendingUp },
  'high-risk': { label: '⚠️ High Risk', color: '#f59e0b', icon: ShieldAlert },
  normal:    { label: '',            color: '#64748b', icon: AlertTriangle },
};

function getAlertType(verdict: Verdict, confidence: number): AlertType {
  if (verdict === 'fake' && confidence >= 90) return 'breaking';
  if (verdict === 'fake' && confidence >= 75) return 'viral';
  if (verdict === 'uncertain' && confidence >= 70) return 'high-risk';
  return 'normal';
}

const VERDICT_STYLE: Record<Verdict, { bg: string; text: string; icon: ElementType; label: string }> = {
  fake:      { bg: 'bg-red-500/12 border-l-red-500',   text: 'text-red-400',   icon: AlertTriangle, label: '⚠ FAKE' },
  real:      { bg: 'bg-green-500/8 border-l-green-500', text: 'text-green-400', icon: CheckCircle,   label: '✓ REAL' },
  uncertain: { bg: 'bg-amber-500/8 border-l-amber-400', text: 'text-amber-400', icon: AlertTriangle, label: '? UNCLEAR' },
};


export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const fakeCount   = notifications.filter((n) => n.verdict === 'fake').length;

  const loadNotifications = useCallback(async () => {
    if (muted) return;
    setLoading(true);
    try {
      const news = await fetchAllNews(12);
      const classified = await Promise.all(
        news.map(async (item) => {
          const res = await classifyText(item.title + ' ' + item.description);
          return {
            id: item.id,
            title: item.title,
            link: item.link,
            source: item.source,
            verdict: res.verdict,
            confidence: res.confidence,
            time: new Date().toLocaleTimeString(),
            read: false,
            alertType: getAlertType(res.verdict, res.confidence),
          } as Notification;
        })
      );
      // Sort: fake on top
      const sorted = classified.sort((a, b) => {
        const rank = (n: Notification) => n.verdict === 'fake' ? 0 : n.verdict === 'uncertain' ? 1 : 2;
        return rank(a) - rank(b);
      });
      setNotifications(sorted);
    } finally {
      setLoading(false);
    }
  }, [muted]);

  // Load on mount
  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Auto-refresh every 5 min
  useEffect(() => {
    const t = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const dismiss = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const dismissAll = () => setNotifications([]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        onClick={() => { setOpen((o) => !o); if (!open) markAllRead(); }}
        className="relative p-2 rounded-xl hover:bg-white/8 transition-colors group"
        title="Notifications"
      >
        <motion.div animate={fakeCount > 0 && !muted ? { rotate: [0, -10, 10, -8, 8, 0] } : {}} transition={{ duration: 0.5, repeat: fakeCount > 0 ? Infinity : 0, repeatDelay: 3 }}>
          <Bell className={`w-4 h-4 transition-colors ${open ? 'text-primary' : 'text-slate-400 group-hover:text-white'}`} />
        </motion.div>
        {/* Priority badge */}
        {(unreadCount > 0 || fakeCount > 0) && !muted && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold rounded-full px-0.5 ${
              fakeCount > 0 ? 'bg-red-500 text-white' : 'bg-primary text-dark'
            }`}
            style={{ boxShadow: fakeCount > 0 ? '0 0 8px rgba(239,68,68,0.6)' : undefined }}
          >
            {fakeCount > 0 ? fakeCount : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-10 w-96 max-h-[75vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50"
            style={{ background: 'rgba(5,11,24,0.97)', backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 flex-shrink-0">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-white text-sm flex-1">Notifications</span>
              {fakeCount > 0 && (
                <span className="text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full">
                  {fakeCount} FAKE
                </span>
              )}
              <div className="flex items-center gap-1 ml-1">
                <button onClick={loadNotifications} disabled={loading} title="Refresh"
                  className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setMuted((m) => !m)} title={muted ? 'Unmute' : 'Mute'}
                  className={`p-1.5 rounded-lg hover:bg-white/8 transition-colors ${muted ? 'text-primary' : 'text-slate-500 hover:text-white'}`}>
                  <BellOff className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setOpen(false)} title="Close"
                  className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Actions bar */}
            {notifications.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white/2 border-b border-white/4 flex-shrink-0">
                <span className="text-xs text-slate-500">{notifications.length} notifications</span>
                <button onClick={markAllRead} className="text-xs text-primary hover:underline ml-auto">Mark all read</button>
                <button onClick={dismissAll} className="text-xs text-slate-500 hover:text-red-400">Clear all</button>
              </div>
            )}

            {/* Notification list */}
            <div className="overflow-y-auto flex-1 no-scrollbar">
              {loading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                  <p className="text-xs text-slate-500">Loading live alerts...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Bell className="w-6 h-6 text-slate-700" />
                  <p className="text-sm text-slate-600">No notifications</p>
                </div>
              ) : (
                <AnimatePresence>
                  {notifications.map((notif) => {
                    const style = VERDICT_STYLE[notif.verdict];
                    const Icon = style.icon;
                    return (
                      <motion.div
                        key={notif.id}
                        layout
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-white/3 border-l-2 hover:bg-white/2 transition-colors group ${style.bg} ${!notif.read ? 'opacity-100' : 'opacity-60'}`}
                      >
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${style.text}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold ${style.text}`}>{style.label}</span>
                            <span className="text-[10px] text-slate-600">{notif.confidence}% conf.</span>
                            {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-auto flex-shrink-0" />}
                          </div>
                          {notif.alertType !== 'normal' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1"
                              style={{ background: ALERT_TYPE_CONFIG[notif.alertType].color + '20', color: ALERT_TYPE_CONFIG[notif.alertType].color, border: `1px solid ${ALERT_TYPE_CONFIG[notif.alertType].color}40` }}>
                              {ALERT_TYPE_CONFIG[notif.alertType].label}
                            </span>
                          )}
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{notif.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-600">{notif.source}</span>
                            <span className="text-[10px] text-slate-700">·</span>
                            <span className="text-[10px] text-slate-700">{notif.time}</span>
                            <a href={notif.link} target="_blank" rel="noopener noreferrer"
                              className="ml-auto text-slate-700 hover:text-primary transition-colors">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        <button onClick={() => dismiss(notif.id)}
                          className="flex-shrink-0 text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/5 flex-shrink-0">
              <p className="text-[10px] text-slate-600 text-center">
                Auto-refreshes every 5 min · {muted ? '🔕 Muted' : '🔔 Active'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
