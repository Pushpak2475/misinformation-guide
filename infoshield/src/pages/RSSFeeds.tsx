import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, ExternalLink, Filter } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import GlassCard from '../components/ui/GlassCard';
import RefreshStatusBar from '../components/ui/RefreshStatusBar';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import {
  fetchAllNews, fetchIndiaNews,
  RSS_SOURCES, INDIA_SOURCES, type NewsItem,
} from '../services/newsService';
import { classifyText, type Verdict } from '../services/classifierService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ClassifiedItem extends NewsItem { verdict: Verdict; confidence: number; }

const VERDICT_COLORS: Record<Verdict, string> = { fake: '#ef4444', real: '#10b981', uncertain: '#f59e0b' };

export default function RSSFeeds() {
  const [articles, setArticles]         = useState<ClassifiedItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // only true before first articles arrive
  const [filter, setFilter]             = useState<'all' | Verdict>('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Core fetch + classify
  const load = useCallback(async () => {
    // Don't wipe existing articles during background refresh
    // setInitialLoading stays true until the FIRST batch arrives
    try {
      // Fetch ALL sources: international + all 14 India sources in parallel
      const [intl, india] = await Promise.all([
        fetchAllNews(30),
        fetchIndiaNews(30),
      ]);

      // Merge & deduplicate
      const seen = new Set<string>();
      const raw: NewsItem[] = [];
      for (const item of [...intl, ...india]) {
        const k = item.title.slice(0, 40).toLowerCase();
        if (!seen.has(k)) { seen.add(k); raw.push(item); }
      }

      // Classify in batches of 5 (progressive UI update)
      const classified: ClassifiedItem[] = [];
      const BATCH = 5;
      for (let i = 0; i < raw.length; i += BATCH) {
        const batch = raw.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map((item) => classifyText(item.title + ' ' + item.description, item.sourceDomain))
        );
        for (let j = 0; j < batch.length; j++) {
          if (results[j].status !== 'fulfilled') continue;
          const res = (results[j] as PromiseFulfilledResult<Awaited<ReturnType<typeof classifyText>>>).value;
          classified.push({ ...batch[j], verdict: res.verdict, confidence: res.confidence });
        }
        setArticles([...classified]);
        if (classified.length > 0) setInitialLoading(false); // hide spinner once first articles appear
      }
    } catch (e) {
      console.error('[RSSFeeds] load error', e);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Auto-refresh every 5 min
  const { secondsLeft, isRefreshing, lastRefreshed, forceRefresh } = useAutoRefresh(load);

  // Filter & stats
  const filtered = articles.filter((a) => {
    const matchVerdict = filter === 'all' || a.verdict === filter;
    const matchSource  = sourceFilter === 'all' || a.source === sourceFilter;
    return matchVerdict && matchSource;
  });

  const allSources  = [...RSS_SOURCES, ...INDIA_SOURCES];
  const sourceStats = allSources.map((src) => ({
    name:  src.name.slice(0, 10),
    count: articles.filter((a) => a.source === src.name).length,
    fake:  articles.filter((a) => a.source === src.name && a.verdict === 'fake').length,
    real:  articles.filter((a) => a.source === src.name && a.verdict === 'real').length,
  })).filter((s) => s.count > 0);

  const uniqueSources = ['all', ...Array.from(new Set(articles.map((a) => a.source)))];
  const fakeCount     = articles.filter((a) => a.verdict === 'fake').length;
  const realCount     = articles.filter((a) => a.verdict === 'real').length;
  const isFirstLoad   = initialLoading && articles.length === 0;

  return (
    <AppLayout title="RSS Feeds" subtitle={`Live aggregation from ${allSources.length} sources — auto-refreshes every 5 min`}>
      {/* Auto-refresh status bar */}
      <RefreshStatusBar
        secondsLeft={secondsLeft}
        isRefreshing={isRefreshing}
        lastRefreshed={lastRefreshed}
        onRefreshNow={forceRefresh}
        statusLabel={`Fetching ${allSources.length} sources & running AI classifier\u2026`}
      />

      {/* Summary stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Sources',    value: String(allSources.length), color: '#00d4ff' },
          { label: 'Fetched',    value: String(articles.length),   color: '#7c3aed' },
          { label: 'Verified \u2713', value: String(realCount),   color: '#10b981' },
          { label: 'Flagged \u2717',  value: String(fakeCount),   color: '#ef4444' },
        ].map((s) => (
          <GlassCard key={s.label} delay={0} className="!p-3 text-center">
            <div className="text-xl font-bold" style={{ color: s.color }}>
              {isFirstLoad ? <span className="animate-pulse text-slate-600">—</span> : s.value}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Active source grid */}
      <GlassCard delay={0.05} className="!p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-white">Monitored Sources ({allSources.length})</span>
          <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {allSources.map((src) => (
            <div key={src.name} className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/3 rounded-lg px-2 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              <span className="truncate">{src.name}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Source breakdown chart */}
      {!isFirstLoad && sourceStats.length > 0 && (
        <GlassCard delay={0.1} className="!p-5 mb-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Articles per Source (verified vs flagged)
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sourceStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(5,11,24,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} />
              <Bar dataKey="real" name="Verified" stackId="a" fill="#10b981" opacity={0.8} radius={[0,0,0,0]} />
              <Bar dataKey="fake" name="Flagged"  stackId="a" fill="#ef4444" opacity={0.8} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Filters + Articles */}
      <GlassCard delay={0.15} className="!p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-white">Live Feed</span>
            <span className="text-xs text-primary/70">{filtered.length} articles</span>
          </div>

          <div className="flex gap-1.5 ml-auto flex-wrap items-center">
            {(['all', 'fake', 'real', 'uncertain'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`text-xs px-2.5 py-1.5 rounded-full transition-all ${
                  filter === v
                    ? v === 'all'  ? 'bg-primary/20 text-primary border border-primary/30'
                    : v === 'fake' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : v === 'real' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    :                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'border border-white/8 text-slate-500 hover:text-white hover:border-white/20'
                }`}
              >
                {v.toUpperCase()}
              </button>
            ))}

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs bg-white/5 border border-white/10 text-slate-400 rounded-lg px-2 py-1.5 max-w-[120px]"
            >
              {uniqueSources.map((s) => (
                <option key={s} value={s} className="bg-dark">{s === 'all' ? 'All Sources' : s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-white/3 max-h-[62vh] overflow-y-auto no-scrollbar">
          {isFirstLoad ? (
            <div className="p-8 text-center">
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-slate-500 text-sm">Fetching & classifying from {allSources.length} sources\u2026</p>
                <p className="text-slate-600 text-xs">First load takes a few seconds</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-600 text-sm">No articles match the current filter.</div>
          ) : (
            filtered.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.015, 0.5) }}
                className="flex items-start gap-4 px-4 sm:px-5 py-3.5 hover:bg-white/2 transition-colors group"
              >
                <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: VERDICT_COLORS[article.verdict] }} />
                <div className="flex-1 min-w-0">
                  <a href={article.link} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-white group-hover:text-primary transition-colors line-clamp-1 font-medium">
                    {article.title}
                  </a>
                  {article.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{article.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-primary/70">{article.source}</span>
                    <span className="text-[10px] text-slate-600">{article.category}</span>
                    <span className="text-[10px] text-slate-700">
                      {new Date(article.pubDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge-${article.verdict}`}>{article.verdict.toUpperCase()}</span>
                  <span className="text-xs text-slate-600">{article.confidence}%</span>
                  <a href={article.link} target="_blank" rel="noopener noreferrer"
                    className="text-slate-700 hover:text-slate-400 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </GlassCard>
    </AppLayout>
  );
}
