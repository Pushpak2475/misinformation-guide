import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, RefreshCw, ExternalLink, Filter } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import { fetchAllNews, RSS_SOURCES, type NewsItem } from '../services/newsService';
import { classifyText, type Verdict } from '../services/classifierService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ClassifiedItem extends NewsItem { verdict: Verdict; confidence: number; }

const VERDICT_COLORS: Record<Verdict, string> = { fake: '#ef4444', real: '#10b981', uncertain: '#f59e0b' };

export default function RSSFeeds() {
  const [articles, setArticles] = useState<ClassifiedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [filter, setFilter] = useState<'all' | Verdict>('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const load = useCallback(async () => {
    setRefreshing(true);
    const raw = await fetchAllNews(40);
    const classified = await Promise.all(
      raw.map(async (item) => {
        const res = await classifyText(item.title + ' ' + item.description);
        return { ...item, verdict: res.verdict, confidence: res.confidence };
      })
    );
    setArticles(classified);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Initial load — use local async fn inside effect to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setRefreshing(true);
      const raw = await fetchAllNews(40);
      if (cancelled) return;
      const classified = await Promise.all(
        raw.map(async (item) => {
          const res = await classifyText(item.title + ' ' + item.description);
          return { ...item, verdict: res.verdict, confidence: res.confidence };
        })
      );
      if (cancelled) return;
      setArticles(classified);
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
      setRefreshing(false);
    }
    void init();
    return () => { cancelled = true; };
  }, []);

  const filtered = articles.filter((a) => {
    const matchVerdict = filter === 'all' || a.verdict === filter;
    const matchSource = sourceFilter === 'all' || a.source === sourceFilter;
    return matchVerdict && matchSource;
  });

  // Source stats for chart
  const sourceStats = RSS_SOURCES.map((src) => ({
    name: src.name.replace(' News', '').replace('News', ''),
    count: articles.filter((a) => a.source === src.name).length,
    fake: articles.filter((a) => a.source === src.name && a.verdict === 'fake').length,
    real: articles.filter((a) => a.source === src.name && a.verdict === 'real').length,
  })).filter((s) => s.count > 0);

  const uniqueSources = ['all', ...Array.from(new Set(articles.map((a) => a.source)))];

  return (
    <div className="flex h-screen bg-dark overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Navbar title="RSS Feeds" subtitle={`Live news aggregation from ${RSS_SOURCES.length} trusted sources${lastUpdated ? ` · Updated ${lastUpdated}` : ''}`} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Source grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {RSS_SOURCES.slice(0, 8).map((src, i) => (
              <GlassCard key={src.name} delay={i * 0.04} className="!p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-medium text-white truncate">{src.name}</span>
                </div>
                <div className="text-[10px] text-slate-500">{src.domain}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{src.category}</div>
              </GlassCard>
            ))}
          </div>

          {/* Source breakdown chart */}
          {!loading && sourceStats.length > 0 && (
            <GlassCard delay={0.1} className="!p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Articles per Source
              </h3>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={sourceStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(5,11,24,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} />
                  <Bar dataKey="real" name="Real" stackId="a" fill="#10b981" opacity={0.8} radius={[0,0,0,0]} />
                  <Bar dataKey="fake" name="Fake" stackId="a" fill="#ef4444" opacity={0.8} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {/* Filters + Articles */}
          <GlassCard delay={0.15} className="!p-0 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-white">Live Feed</span>
                <span className="text-xs text-primary/70">{filtered.length} articles</span>
              </div>

              <div className="flex gap-2 ml-auto flex-wrap">
                {/* Verdict filter */}
                {(['all', 'fake', 'real', 'uncertain'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setFilter(v)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      filter === v
                        ? v === 'all' ? 'bg-primary/20 text-primary border border-primary/30'
                          : v === 'fake' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : v === 'real' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'border border-white/8 text-slate-500 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}

                {/* Source filter */}
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="text-xs bg-white/5 border border-white/10 text-slate-400 rounded-lg px-2 py-1.5"
                >
                  {uniqueSources.map((s) => (
                    <option key={s} value={s} className="bg-dark">{s === 'all' ? 'All Sources' : s}</option>
                  ))}
                </select>

                <button onClick={load} disabled={refreshing} className="btn-ghost py-1.5 px-3 text-xs">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/3 max-h-[60vh] overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Fetching live RSS feeds...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-sm">No articles match the current filter.</div>
              ) : (
                filtered.map((article, i) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors group"
                  >
                    <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: VERDICT_COLORS[article.verdict] }} />
                    <div className="flex-1 min-w-0">
                      <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-sm text-white group-hover:text-primary transition-colors line-clamp-1 font-medium">
                        {article.title}
                      </a>
                      {article.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{article.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-primary/70">{article.source}</span>
                        <span className="text-[10px] text-slate-600">{article.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge-${article.verdict}`}>{article.verdict.toUpperCase()}</span>
                      <span className="text-xs text-slate-600">{article.confidence}%</span>
                      <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-400 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </main>
      </div>
    </div>
  );
}
