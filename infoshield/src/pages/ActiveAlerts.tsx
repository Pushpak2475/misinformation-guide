/**
 * ActiveAlerts.tsx — Fixed version
 *
 * Key fixes:
 * 1. Classify articles in batches of 5 (not all at once) to prevent overload
 * 2. Shows skeleton loading immediately, then populates progressively
 * 3. Fetches from BOTH mainstream + misinformation-prone sources
 * 4. Severity calculation improved — uncertain from low-cred source = medium alert
 * 5. Source-platform badges added
 */
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bell, BellOff, X, RefreshCw, ExternalLink, ShieldAlert, CheckCircle } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import GlassCard from '../components/ui/GlassCard';
import RefreshStatusBar from '../components/ui/RefreshStatusBar';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { fetchAllNews, fetchMisinformationSources, fetchRedditTrending, fetchIndiaNews } from '../services/newsService';
import { classifyText, type Verdict } from '../services/classifierService';

interface Alert {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceDomain: string;
  verdict: Verdict;
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  dismissed: boolean;
  alertTime: string;
  platform: string;
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function getSeverity(verdict: Verdict, confidence: number, sourceDomain: string): Alert['severity'] {
  // Low-credibility domain sources that are uncertain are still suspicious
  const LOW_CRED_DOMAINS = ['rt.com', 'zerohedge.com', 'dailymail.co.uk', 'nypost.com', 'reddit.com'];
  const isLowCred = LOW_CRED_DOMAINS.some((d) => sourceDomain.includes(d));

  if (verdict === 'fake' && confidence >= 88) return 'critical';
  if (verdict === 'fake' && confidence >= 72) return 'high';
  if (verdict === 'fake') return 'medium';
  if (verdict === 'uncertain' && isLowCred) return 'medium';
  if (verdict === 'uncertain') return 'low';
  return 'low';
}

const SEV = {
  critical: {
    dot:   'bg-red-500 animate-pulse',
    badge: 'bg-red-500/15 text-red-400 border border-red-500/30',
    bar:   'bg-red-500',
    label: 'CRITICAL',
    icon:  ShieldAlert,
    border:'border-l-red-500',
    bg:    'bg-red-500/4',
  },
  high: {
    dot:   'bg-orange-500 animate-pulse',
    badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    bar:   'bg-orange-500',
    label: 'HIGH',
    icon:  AlertTriangle,
    border:'border-l-orange-500',
    bg:    'bg-orange-500/4',
  },
  medium: {
    dot:   'bg-amber-500',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    bar:   'bg-amber-500',
    label: 'MEDIUM',
    icon:  AlertTriangle,
    border:'border-l-amber-500/50',
    bg:    '',
  },
  low: {
    dot:   'bg-green-500',
    badge: 'bg-green-500/15 text-green-400 border border-green-500/30',
    bar:   'bg-green-500',
    label: 'LOW',
    icon:  CheckCircle,
    border:'border-l-white/10',
    bg:    '',
  },
};

export default function ActiveAlerts() {
  const [alerts, setAlerts]             = useState<Alert[]>([]);
  const [loading, setLoading]           = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<'all' | Alert['severity']>('all');
  const [refreshing, setRefreshing]     = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadAlerts = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setRefreshing(true);
    setLoading(true);
    setAlerts([]);

    try {
      // Fetch from ALL sources: mainstream + misinformation + India + Reddit
      const [mainstream, misinfo, india, reddit] = await Promise.allSettled([
        fetchAllNews(20),
        fetchMisinformationSources(),
        fetchIndiaNews(20),
        fetchRedditTrending(true),
      ]);

      if (ctrl.signal.aborted) return;

      // Combine into raw items
      const rawItems: { id: string; title: string; link: string; source: string; domain: string; platform: string }[] = [];

      if (mainstream.status === 'fulfilled') {
        for (const n of mainstream.value) {
          rawItems.push({ id: n.id, title: n.title, link: n.link, source: n.source, domain: n.sourceDomain, platform: 'RSS' });
        }
      }
      if (misinfo.status === 'fulfilled') {
        for (const m of misinfo.value) {
          rawItems.push({ id: m.id, title: m.title, link: m.link, source: m.source, domain: m.sourceDomain, platform: m.category });
        }
      }
      if (india.status === 'fulfilled') {
        for (const n of india.value) {
          rawItems.push({ id: n.id, title: n.title, link: n.link, source: n.source, domain: n.sourceDomain, platform: 'India RSS' });
        }
      }
      if (reddit.status === 'fulfilled') {
        for (const r of reddit.value.slice(0, 8)) {
          rawItems.push({
            id: r.id, title: r.title,
            link: r.permalink, source: `Reddit r/${r.subreddit}`,
            domain: 'reddit.com', platform: 'Reddit',
          });
        }
      }

      if (ctrl.signal.aborted || rawItems.length === 0) return;

      // Classify in batches of 5
      const BATCH = 5;
      const classified: Alert[] = [];

      for (let i = 0; i < rawItems.length; i += BATCH) {
        if (ctrl.signal.aborted) return;
        const batch = rawItems.slice(i, i + BATCH);

        const results = await Promise.allSettled(
          batch.map((item) => classifyText(item.title, item.domain))
        );

        for (let j = 0; j < batch.length; j++) {
          if (results[j].status !== 'fulfilled') continue;
          const r = (results[j] as PromiseFulfilledResult<Awaited<ReturnType<typeof classifyText>>>).value;
          const item = batch[j];
          const severity = getSeverity(r.verdict, r.confidence, item.domain);
          classified.push({
            id: item.id,
            title: item.title,
            link: item.link,
            source: item.source,
            sourceDomain: item.domain,
            verdict: r.verdict,
            confidence: r.confidence,
            severity,
            dismissed: false,
            alertTime: new Date().toLocaleTimeString(),
            platform: item.platform,
          });
        }

        // Update UI progressively after each batch
        const sorted = [...classified].sort(
          (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        );
        setAlerts(sorted);

        if (i === 0) setLoading(false); // Show first batch immediately
      }

    } catch (err) {
      if (!ctrl.signal.aborted) console.error('Alert load error:', err);
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Auto-refresh every 5 min (replaces the old manual setInterval)
  const { secondsLeft, isRefreshing: autoRefreshing, lastRefreshed, forceRefresh } =
    useAutoRefresh(loadAlerts);

  // Keep legacy refreshing in sync
  // (loadAlerts sets its own setRefreshing internally)

  const dismiss    = (id: string)  => setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, dismissed: true } : a));
  const dismissAll = ()            => setAlerts((prev) => prev.map((a) => ({ ...a, dismissed: true })));

  const visible = alerts.filter(
    (a) => !a.dismissed && (severityFilter === 'all' || a.severity === severityFilter)
  );

  const counts = {
    critical: alerts.filter((a) => !a.dismissed && a.severity === 'critical').length,
    high:     alerts.filter((a) => !a.dismissed && a.severity === 'high').length,
    medium:   alerts.filter((a) => !a.dismissed && a.severity === 'medium').length,
    low:      alerts.filter((a) => !a.dismissed && a.severity === 'low').length,
  };

  return (
    <AppLayout
      title="Active Alerts"
      subtitle={`${visible.length} active · ${counts.critical} critical · ${counts.high} high`}
    >
          {/* Auto-refresh status bar */}
          <RefreshStatusBar
            secondsLeft={secondsLeft}
            isRefreshing={autoRefreshing || refreshing}
            lastRefreshed={lastRefreshed}
            onRefreshNow={forceRefresh}
            statusLabel={`Scanning ${visible.length} alerts across all sources…`}
          />

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.entries(counts) as [Alert['severity'], number][]).map(([sev, count], i) => {
              const s = SEV[sev];
              const Icon = s.icon;
              return (
                <GlassCard key={sev} delay={i * 0.06} className="!p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-3.5 h-3.5 ${sev === 'critical' ? 'text-red-400' : sev === 'high' ? 'text-orange-400' : sev === 'medium' ? 'text-amber-400' : 'text-green-400'}`} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                  </div>
                  <div className={`text-3xl font-bold ${sev === 'critical' ? 'text-red-400' : sev === 'high' ? 'text-orange-400' : sev === 'medium' ? 'text-amber-400' : 'text-green-400'}`}>
                    {loading && count === 0 ? <span className="text-slate-600 text-2xl animate-pulse">—</span> : count}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">alerts active</div>
                  <div className="w-full bg-white/5 rounded-full h-1 mt-2">
                    <div className={`h-full rounded-full transition-all duration-700 ${s.bar}`}
                      style={{ width: `${alerts.length > 0 ? (count / Math.max(alerts.length, 1)) * 100 : 0}%` }} />
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Alert feed */}
          <GlassCard delay={0.2} className="!p-0 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="font-semibold text-white text-sm">Alert Feed</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-slate-500 hidden sm:block">RSS + Reddit + Tabloids</span>
              </div>

              <div className="flex gap-1.5 ml-auto flex-wrap items-center">
                {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`text-xs px-2 sm:px-3 py-1.5 rounded-full transition-all border ${
                      severityFilter === s
                        ? s === 'all'      ? 'bg-primary/20 text-primary border-primary/30'
                        : s === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : s === 'high'     ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        : s === 'medium'   ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                           : 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'border-white/8 text-slate-500 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span className="sm:hidden">
                      {s === 'all' ? 'ALL' : s === 'critical' ? 'CRIT' : s === 'high' ? 'HIGH' : s === 'medium' ? 'MED' : 'LOW'}
                    </span>
                    <span className="hidden sm:inline">{s.toUpperCase()}</span>
                    {s !== 'all' && counts[s] > 0 && (
                      <span className="ml-1 opacity-70">({counts[s]})</span>
                    )}
                  </button>
                ))}
                <button onClick={() => setSoundEnabled((p) => !p)} className="btn-ghost py-1.5 px-2 sm:px-3 text-xs" title="Toggle sound">
                  {soundEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={dismissAll} className="btn-ghost py-1.5 px-2 sm:px-3 text-xs text-slate-500 hover:text-red-400">
                  <X className="w-3.5 h-3.5 sm:hidden" />
                  <span className="hidden sm:inline">Dismiss All</span>
                </button>
                <button onClick={loadAlerts} disabled={refreshing} className="btn-ghost py-1.5 px-2 sm:px-3 text-xs">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="max-h-[62vh] overflow-y-auto no-scrollbar">
              {loading && alerts.length === 0 ? (
                /* Skeleton loading */
                <div className="p-6 space-y-3">
                  <p className="text-xs text-slate-500 text-center mb-4 animate-pulse">
                    Fetching & classifying live alerts from RSS, Reddit, and low-credibility sources...
                  </p>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border border-white/4 rounded-xl animate-pulse">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10 mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-white/6 rounded w-4/5" />
                        <div className="h-2.5 bg-white/4 rounded w-2/5" />
                      </div>
                      <div className="h-5 w-16 bg-white/6 rounded-full flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-white font-medium mb-1">No alerts match this filter</p>
                  <p className="text-slate-500 text-sm">Try switching the severity filter or refreshing.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {visible.map((alert, i) => {
                    const s = SEV[alert.severity];
                    return (
                      <motion.div
                        key={alert.id}
                        layout
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        className={`flex items-start gap-4 px-5 py-4 border-b border-white/3 border-l-2 transition-colors group ${s.border} ${s.bg} hover:bg-white/2`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${s.dot}`} />

                        <div className="flex-1 min-w-0">
                          <a
                            href={alert.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-white group-hover:text-primary transition-colors line-clamp-2"
                          >
                            {alert.title}
                          </a>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                            <span className={`badge-${alert.verdict}`}>{alert.verdict.toUpperCase()}</span>
                            <span className="text-[10px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">{alert.platform}</span>
                            <span className="text-[10px] text-slate-500 truncate">{alert.source}</span>
                            <span className="text-[10px] text-slate-600">{alert.confidence}% conf.</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                          <span className="text-[10px] text-slate-700">{alert.alertTime}</span>
                          <a
                            href={alert.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 hover:text-primary transition-colors p-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => dismiss(alert.id)}
                            className="text-slate-700 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </GlassCard>
    </AppLayout>
  );
}
