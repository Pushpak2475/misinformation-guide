/**
 * LiveStream.tsx — Fixed version
 *
 * Key fixes:
 * 1. Classify ALL items FIRST in parallel (batch), THEN stream them into UI one-by-one
 *    → No more 30+ second wait before anything appears
 * 2. AbortController ref to cancel streaming when refresh/unmount happens
 * 3. Shows progress bar while classifying batch
 * 4. Twitter/X, Mastodon, Telegram added via newsService
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, RefreshCw, Activity, Pause, Play, Circle,
  AlertTriangle, ExternalLink, Radio,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import {
  fetchAllNews, fetchRedditTrending, fetchNitterFeed,
  fetchMastodon, fetchMisinformationSources, fetchTelegramChannels,
} from '../services/newsService';
import { classifyText, type Verdict } from '../services/classifierService';
import RadialChart from '../components/charts/RadialChart';

interface StreamItem {
  id: string;
  title: string;
  source: string;
  link: string;
  verdict: Verdict;
  confidence: number;
  platform: string;
  time: string;
}

const VERDICT_COLORS: Record<Verdict, string> = {
  fake: '#ef4444',
  real: '#10b981',
  uncertain: '#f59e0b',
};

const PLATFORM_STYLE: Record<string, { bg: string; text: string }> = {
  'RSS':       { bg: 'bg-primary/10',    text: 'text-primary/80' },
  'Reddit':    { bg: 'bg-orange-500/12', text: 'text-orange-400' },
  'Twitter/X': { bg: 'bg-sky-500/12',    text: 'text-sky-400'    },
  'Mastodon':  { bg: 'bg-purple-500/12', text: 'text-purple-400' },
  'Telegram':  { bg: 'bg-blue-500/12',   text: 'text-blue-400'   },
  'Tabloid':   { bg: 'bg-red-500/10',    text: 'text-red-400'    },
  'State Media':{ bg: 'bg-rose-500/10',  text: 'text-rose-400'   },
  'Alt-Media': { bg: 'bg-amber-500/10',  text: 'text-amber-400'  },
};

function sortStream(items: StreamItem[]): StreamItem[] {
  return [...items].sort((a, b) => {
    const rank = (s: StreamItem) =>
      s.verdict === 'fake' && s.confidence >= 85 ? 0 :
      s.verdict === 'fake' ? 1 :
      s.verdict === 'uncertain' ? 2 : 3;
    return rank(a) - rank(b);
  });
}

export default function LiveStream() {
  const [stream, setStream]       = useState<StreamItem[]>([]);
  const [paused, setPaused]       = useState(false);
  const [progress, setProgress]   = useState(0);  // 0-100 during batch classify
  const [phase, setPhase]         = useState<'fetching' | 'classifying' | 'streaming' | 'done'>('fetching');
  const [stats, setStats]         = useState({ total: 0, fake: 0, real: 0, uncertain: 0 });
  const [newFakeIds, setNewFakeIds] = useState<Set<string>>(new Set());
  const abortRef    = useRef<AbortController | null>(null);
  const pausedRef   = useRef(false);
  pausedRef.current = paused;

  const flashFake = (id: string) => {
    setNewFakeIds((prev) => new Set([...prev, id]));
    setTimeout(() => setNewFakeIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), 2500);
  };

  const run = useCallback(async () => {
    // Cancel any existing run
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setProgress(0);
    setPhase('fetching');
    setStream([]);
    setStats({ total: 0, fake: 0, real: 0, uncertain: 0 });

    try {
      // ── PHASE 1: Fetch all sources in parallel
      const [news, reddit, nitter, mastodon, misinfo, telegram] = await Promise.allSettled([
        fetchAllNews(15),
        fetchRedditTrending(true),
        fetchNitterFeed(),
        fetchMastodon(5),
        fetchMisinformationSources(),
        fetchTelegramChannels(),
      ]);

      if (ctrl.signal.aborted) return;

      const rawItems: { id: string; title: string; source: string; link: string; domain: string; platform: string }[] = [];

      if (news.status === 'fulfilled') {
        for (const n of news.value) {
          rawItems.push({ id: n.id, title: n.title, source: n.source, link: n.link, domain: n.sourceDomain, platform: 'RSS' });
        }
      }
      if (reddit.status === 'fulfilled') {
        for (const r of reddit.value.slice(0, 6)) {
          rawItems.push({ id: r.id, title: r.title, source: `Reddit r/${r.subreddit}`, link: r.permalink, domain: 'reddit.com', platform: 'Reddit' });
        }
      }
      if (nitter.status === 'fulfilled') {
        for (const t of nitter.value) {
          rawItems.push({ id: t.id, title: t.title, source: t.source, link: t.link, domain: 'twitter.com', platform: 'Twitter/X' });
        }
      }
      if (mastodon.status === 'fulfilled') {
        for (const m of mastodon.value) {
          rawItems.push({ id: m.id, title: m.title, source: m.source, link: m.link, domain: 'mastodon.social', platform: 'Mastodon' });
        }
      }
      if (misinfo.status === 'fulfilled') {
        for (const m of misinfo.value.slice(0, 6)) {
          rawItems.push({ id: m.id, title: m.title, source: m.source, link: m.link, domain: m.sourceDomain, platform: m.category });
        }
      }
      if (telegram.status === 'fulfilled') {
        for (const tg of telegram.value) {
          rawItems.push({ id: tg.id, title: tg.title, source: tg.source, link: tg.link, domain: 'telegram.org', platform: 'Telegram' });
        }
      }

      // Deduplicate by title prefix
      const seen = new Set<string>();
      const unique = rawItems.filter((item) => {
        const key = item.title.slice(0, 30).toLowerCase();
        if (seen.has(key) || key.length < 5) return false;
        seen.add(key);
        return true;
      });

      if (unique.length === 0 || ctrl.signal.aborted) return;

      // ── PHASE 2: Classify ALL items in parallel batches of 8
      setPhase('classifying');
      const classified: StreamItem[] = [];
      const BATCH = 8;
      for (let i = 0; i < unique.length; i += BATCH) {
        if (ctrl.signal.aborted) return;
        const batch = unique.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map((item) => classifyText(item.title, item.domain))
        );
        for (let j = 0; j < batch.length; j++) {
          if (results[j].status === 'fulfilled') {
            const r = (results[j] as PromiseFulfilledResult<Awaited<ReturnType<typeof classifyText>>>).value;
            classified.push({
              id: batch[j].id,
              title: batch[j].title,
              source: batch[j].source,
              link: batch[j].link,
              verdict: r.verdict,
              confidence: r.confidence,
              platform: batch[j].platform,
              time: new Date().toLocaleTimeString(),
            });
          }
        }
        setProgress(Math.round(((i + BATCH) / unique.length) * 100));
      }

      if (ctrl.signal.aborted) return;

      // ── PHASE 3: Stream into UI one by one
      setPhase('streaming');

      for (let i = 0; i < classified.length; i++) {
        if (ctrl.signal.aborted) return;

        // Wait if paused
        while (pausedRef.current) {
          await new Promise((r) => setTimeout(r, 300));
          if (ctrl.signal.aborted) return;
        }

        const item = classified[i];
        setStream((prev) => sortStream([item, ...prev]).slice(0, 80));
        setStats((prev) => ({
          total: prev.total + 1,
          fake: prev.fake + (item.verdict === 'fake' ? 1 : 0),
          real: prev.real + (item.verdict === 'real' ? 1 : 0),
          uncertain: prev.uncertain + (item.verdict === 'uncertain' ? 1 : 0),
        }));
        if (item.verdict === 'fake') flashFake(item.id);

        // Stagger delay: faster at first, then settle
        await new Promise((r) => setTimeout(r, i < 10 ? 180 : 350));
      }
      setPhase('done');

    } catch (err) {
      if (!ctrl.signal.aborted) console.error('Stream error:', err);
    } finally {
      if (!ctrl.signal.aborted) {
        setProgress(100);
      }
    }
  }, []);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [run]);

  const fakeItems  = stream.filter((s) => s.verdict === 'fake');
  const otherItems = stream.filter((s) => s.verdict !== 'fake');
  const fakeRate   = stats.total > 0 ? Math.round((stats.fake  / stats.total) * 100) : 0;
  const realRate   = stats.total > 0 ? Math.round((stats.real  / stats.total) * 100) : 0;

  return (
    <div className="flex h-screen bg-dark overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Navbar
          title="Live Stream"
          subtitle={
            phase === 'fetching'     ? '⏳ Fetching from 6 platforms...' :
            phase === 'classifying'  ? `🧠 AI classifying articles... ${progress}%` :
            phase === 'streaming'    ? (paused ? '⏸ Paused' : `🔴 Live — ${fakeItems.length} FAKE pinned at top`) :
            `✅ Stream complete — ${stream.length} articles classified`
          }
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Progress bar during classifying */}
          {(phase === 'fetching' || phase === 'classifying') && (
            <GlassCard delay={0} className="!p-4">
              <div className="flex items-center gap-3 mb-3">
                <Radio className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-white font-medium">
                  {phase === 'fetching' ? 'Fetching live data from 6 platforms...' : `AI classifying — ${progress}% complete`}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-accent-purple transition-all duration-500"
                  style={{ width: phase === 'fetching' ? '10%' : `${progress}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {['RSS (15 sources)', 'Reddit', 'Twitter/X', 'Mastodon', 'Telegram', 'Tabloids'].map((p) => (
                  <span key={p} className="text-[10px] text-slate-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />{p}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Classified', value: stats.total,     color: '#00d4ff' },
              { label: 'Fake Detected',    value: stats.fake,      color: '#ef4444' },
              { label: 'Verified Real',    value: stats.real,      color: '#10b981' },
              { label: 'Uncertain',        value: stats.uncertain, color: '#f59e0b' },
            ].map((s, i) => (
              <GlassCard key={s.label} delay={i * 0.06} className="!p-4">
                <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                <div className="text-2xl font-bold transition-all duration-300" style={{ color: s.color }}>{s.value}</div>
                <div className="progress-bar mt-2">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.total > 0 ? (s.value / stats.total) * 100 : 3}%`, background: s.color }} />
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stream feed */}
            <GlassCard delay={0.1} className="lg:col-span-2 !p-0 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-wrap">
                <div className="flex items-center gap-2">
                  <Circle
                    className={`w-3 h-3 ${paused ? 'text-slate-500' : phase === 'streaming' ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}
                    fill={paused ? '#64748b' : phase === 'streaming' ? '#ef4444' : '#475569'}
                  />
                  <span className="font-semibold text-white text-sm">
                    {paused ? 'PAUSED' : phase === 'done' ? 'COMPLETE' : 'LIVE'}
                  </span>
                  <span className="text-xs text-slate-500">— {stream.length} items</span>
                  {fakeItems.length > 0 && (
                    <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full animate-pulse">
                      ⚠ {fakeItems.length} FAKE PINNED
                    </span>
                  )}
                </div>
                <div className="flex gap-2 ml-auto">
                  {phase === 'streaming' && (
                    <button onClick={() => setPaused((p) => !p)}
                      className={`btn-ghost py-1.5 px-3 text-xs ${paused ? 'text-green-400 border-green-400/30' : ''}`}>
                      {paused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
                    </button>
                  )}
                  <button onClick={run} disabled={phase === 'fetching' || phase === 'classifying'} className="btn-ghost py-1.5 px-3 text-xs">
                    <RefreshCw className={`w-3.5 h-3.5 ${(phase === 'fetching' || phase === 'classifying') ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="max-h-[65vh] overflow-y-auto no-scrollbar">
                {/* Initial loading state */}
                {stream.length === 0 && (phase === 'fetching' || phase === 'classifying') && (
                  <div className="p-10 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      {[0, 0.15, 0.3].map((d, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                    <p className="text-slate-400 text-sm font-medium mb-1">
                      {phase === 'fetching' ? 'Connecting to 6 data sources...' : `Running AI classification... ${progress}%`}
                    </p>
                    <p className="text-slate-600 text-xs">RSS · Reddit · Twitter/X · Mastodon · Telegram · Tabloids</p>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {/* FAKE section */}
                  {fakeItems.length > 0 && (
                    <div key="fake-section">
                      <div className="flex items-center gap-2 px-5 py-2 bg-red-500/8 border-b border-red-500/20 sticky top-0 z-10">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                          ⚠ Misinformation Alert — {fakeItems.length} article{fakeItems.length > 1 ? 's' : ''} detected
                        </span>
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-auto" />
                      </div>
                      {fakeItems.map((item) => {
                        const isFlashing = newFakeIds.has(item.id);
                        const pStyle = PLATFORM_STYLE[item.platform] ?? PLATFORM_STYLE['RSS'];
                        return (
                          <motion.a
                            key={`fake-${item.id}`}
                            href={item.link} target="_blank" rel="noopener noreferrer"
                            layout
                            initial={{ opacity: 0, y: -12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, type: 'spring', stiffness: 280, damping: 26 }}
                            className={`flex items-start gap-3 px-5 py-4 border-b border-red-500/12 group block transition-all duration-600 ${
                              isFlashing
                                ? 'bg-red-500/18 border-l-4 border-l-red-500'
                                : 'bg-red-500/5 border-l-4 border-l-red-500/40 hover:bg-red-500/10'
                            }`}
                          >
                            <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 bg-red-500 ${isFlashing ? 'animate-ping' : 'animate-pulse'}`} />
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium line-clamp-2 transition-colors ${isFlashing ? 'text-red-300' : 'text-white group-hover:text-red-300'}`}>
                                {item.title}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="badge-fake">FAKE</span>
                                <span className="text-xs font-bold text-red-400">{item.confidence}%</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${pStyle.bg} ${pStyle.text}`}>{item.platform}</span>
                                <span className="text-[10px] text-slate-500">{item.source}</span>
                                <span className="text-[10px] text-slate-600 ml-auto">{item.time}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-red-600 group-hover:text-red-300 transition-colors flex-shrink-0 mt-1" />
                          </motion.a>
                        );
                      })}
                    </div>
                  )}

                  {/* Divider */}
                  {fakeItems.length > 0 && otherItems.length > 0 && (
                    <div key="divider" className="flex items-center gap-2 px-5 py-2 bg-white/2 border-b border-white/5">
                      <span className="text-xs text-slate-600 uppercase tracking-wider">Other articles — {otherItems.length} items</span>
                    </div>
                  )}

                  {/* REAL / UNCERTAIN articles */}
                  {otherItems.map((item) => {
                    const pStyle = PLATFORM_STYLE[item.platform] ?? PLATFORM_STYLE['RSS'];
                    return (
                      <motion.a
                        key={`other-${item.id}`}
                        href={item.link} target="_blank" rel="noopener noreferrer"
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-3 px-5 py-3 border-b border-white/3 hover:bg-white/2 transition-colors group block"
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: VERDICT_COLORS[item.verdict], boxShadow: `0 0 5px ${VERDICT_COLORS[item.verdict]}50` }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white group-hover:text-primary transition-colors truncate">{item.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${pStyle.bg} ${pStyle.text}`}>{item.platform}</span>
                            <span className="text-[10px] text-slate-500 truncate">{item.source}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`badge-${item.verdict}`}>{item.verdict.toUpperCase()}</span>
                          <span className="text-[10px] text-slate-600">{item.time}</span>
                        </div>
                      </motion.a>
                    );
                  })}
                </AnimatePresence>
              </div>
            </GlassCard>

            {/* Stats panel */}
            <div className="space-y-4">
              <GlassCard delay={0.15} className="!p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-white text-sm">Detection Rate</h3>
                </div>
                <div className="flex justify-center mb-4">
                  <RadialChart value={fakeRate} size={120} color="#ef4444" label="FAKE" sublabel={`${stats.fake}/${stats.total}`} />
                </div>
                <div className="flex justify-center">
                  <RadialChart value={realRate} size={100} color="#10b981" label="REAL" sublabel={`${stats.real}/${stats.total}`} />
                </div>
              </GlassCard>

              <GlassCard delay={0.2} className="!p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-white text-sm">Platforms Active</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'RSS (15 sources)', color: '#00d4ff' },
                    { name: 'Reddit (5 subs)',  color: '#ff6314' },
                    { name: 'Twitter/X',        color: '#1d9bf0' },
                    { name: 'Mastodon',         color: '#a855f7' },
                    { name: 'Telegram',         color: '#229ed9' },
                    { name: 'Tabloids/Alt',     color: '#ef4444' },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="text-slate-400">{p.name}</span>
                      <span className="ml-auto text-[10px] text-green-400">● Active</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Stream status</span>
                    <span className={`font-medium ${phase === 'done' ? 'text-slate-400' : 'text-green-400'}`}>
                      {phase === 'fetching'    ? '⏳ Fetching' :
                       phase === 'classifying' ? '🧠 Classifying' :
                       phase === 'streaming'   ? (paused ? '⏸ Paused' : '🔴 Live') :
                       '✅ Complete'}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
