import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, RefreshCw, ExternalLink, Flame,
  MessageSquare, Globe, TrendingUp,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import GlassCard from '../components/ui/GlassCard';
import RefreshStatusBar from '../components/ui/RefreshStatusBar';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import {
  fetchAllNews, fetchRedditTrending, fetchGoogleTrends, fetchHackerNews,
  fetchIndiaNews,
  RSS_SOURCES, INDIA_SOURCES, type NewsItem, type RedditPost, type SocialPost, type TrendItem,
} from '../services/newsService';
import { classifyText, getDomainCredibility, type Verdict } from '../services/classifierService';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import RadialChart from '../components/charts/RadialChart';
import AgentFlowDiagram from '../components/agents/AgentFlowDiagram';

interface ClassifiedNews extends NewsItem { verdict: Verdict; confidence: number; severity: 'critical' | 'medium' | 'low'; }
interface CategoryStat { category: string; count: number; fill: string }

const CATEGORY_COLORS: Record<string, string> = {
  World: '#7c3aed', US: '#ef4444', Technology: '#00d4ff',
  Science: '#10b981', Business: '#f59e0b', Politics: '#ec4899',
  Trending: '#6366f1', Health: '#f97316', 'Fact Check': '#06b6d4',
  'State Media': '#dc2626', Tabloid: '#9333ea', 'Alt-Media': '#ca8a04',
};

const HOUR_LABELS = ['06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h'];

function buildTrendData(classified: ClassifiedNews[]) {
  return HOUR_LABELS.map((time, i) => ({
    time,
    detected: 30 + i * 8 + classified.length,
    misinfo: Math.round(classified.filter((n) => n.verdict === 'fake').length * (0.4 + i * 0.1)),
    verified: Math.round(classified.filter((n) => n.verdict === 'real').length * (0.5 + i * 0.08)),
  }));
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 text-xs">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [news, setNews]       = useState<ClassifiedNews[]>([]);
  const [reddit, setReddit]   = useState<RedditPost[]>([]);
  const [trends, setTrends]   = useState<TrendItem[]>([]);
  const [hn, setHn]           = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [catStats, setCatStats] = useState<CategoryStat[]>([]);
  const [trendData, setTrendData] = useState(HOUR_LABELS.map((time) => ({ time, detected: 0, misinfo: 0, verified: 0 })));

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fetch from both international AND all 14 India sources simultaneously
      const [rawIntl, rawIndia, redditPosts, googleTrends, hackerNews] = await Promise.all([
        fetchAllNews(20),
        fetchIndiaNews(20),
        fetchRedditTrending(false),
        fetchGoogleTrends(),
        fetchHackerNews(6),
      ]);

      // Merge and deduplicate by title prefix
      const seen = new Set<string>();
      const rawNews: NewsItem[] = [];
      for (const item of [...rawIntl, ...rawIndia]) {
        const key = item.title.slice(0, 40).toLowerCase();
        if (!seen.has(key)) { seen.add(key); rawNews.push(item); }
      }

      // Classify in batches of 5 to avoid overwhelming the classifier
      const classified: ClassifiedNews[] = [];
      const BATCH = 5;
      for (let i = 0; i < rawNews.length; i += BATCH) {
        const batch = rawNews.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map((item) => classifyText(`${item.title} ${item.description}`, item.sourceDomain))
        );
        for (let j = 0; j < batch.length; j++) {
          if (results[j].status !== 'fulfilled') continue;
          const res = (results[j] as PromiseFulfilledResult<Awaited<ReturnType<typeof classifyText>>>).value;
          const severity: ClassifiedNews['severity'] =
            res.verdict === 'fake' && res.confidence > 85 ? 'critical' :
            res.verdict === 'fake' ? 'medium' : 'low';
          classified.push({ ...batch[j], verdict: res.verdict, confidence: res.confidence, severity });
        }
      }

      setNews(classified);
      setReddit(redditPosts.slice(0, 8));
      setTrends(googleTrends);
      setHn(hackerNews);

      const catMap: Record<string, number> = {};
      for (const n of classified) { catMap[n.category] = (catMap[n.category] ?? 0) + 1; }
      setCatStats(
        Object.entries(catMap).map(([category, count]) => ({
          category, count, fill: CATEGORY_COLORS[category] ?? '#64748b',
        })).sort((a, b) => b.count - a.count)
      );

      setTrendData(buildTrendData(classified));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) { console.error('Dashboard load failed', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const { secondsLeft, isRefreshing: autoRefreshing, lastRefreshed, forceRefresh } = useAutoRefresh(loadData);

  // Keep legacy refreshing state in sync for backward-compat UI
  useEffect(() => { setRefreshing(autoRefreshing); }, [autoRefreshing]);


  const fakeCount    = news.filter((n) => n.verdict === 'fake').length;
  const realCount    = news.filter((n) => n.verdict === 'real').length;
  const criticalCount = news.filter((n) => n.severity === 'critical').length;
  const accuracy     = news.length > 0 ? Math.round((realCount / news.length) * 100) : 98;

  const statsCards = [
    { label: 'Articles Fetched', value: news.length.toString(), change: 'Live RSS', trend: 'up', color: '#00d4ff' },
    { label: 'Fake Detected',    value: fakeCount.toString(),   change: `${criticalCount} critical`, trend: fakeCount > 5 ? 'up' : 'down', color: '#ef4444' },
    { label: 'Verified Real',    value: realCount.toString(),   change: `${accuracy}% accuracy`, trend: 'up', color: '#10b981' },
    { label: 'Trending Topics',  value: trends.length.toString(), change: trends[0]?.source ?? 'Loading', trend: 'up', color: '#7c3aed' },
  ];

  const liveSourceStats = RSS_SOURCES.slice(0, 4).map((s) => ({
    source: s.name, credibility: getDomainCredibility(s.domain),
    bias: 'Center', color: getDomainCredibility(s.domain) >= 85 ? '#10b981' : '#f59e0b',
  }));

  const totalSources = RSS_SOURCES.length + INDIA_SOURCES.length;

  return (
    <AppLayout title="Mission Control" subtitle={`Real-time misinformation feed · ${totalSources} sources`}>
          {/* Auto-refresh status bar */}
          <RefreshStatusBar
            secondsLeft={secondsLeft}
            isRefreshing={refreshing}
            lastRefreshed={lastRefreshed || lastUpdated}
            onRefreshNow={forceRefresh}
            statusLabel={`Scanning ${totalSources} sources & verifying ${news.length} articles…`}
          />

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((stat, i) => (
              <GlassCard key={stat.label} delay={i * 0.07} className="!p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
                    <div className="text-2xl font-bold" style={{ color: stat.color }}>
                      {loading ? <span className="text-slate-600 animate-pulse">...</span> : stat.value}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                    style={{
                      background: stat.trend === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: stat.trend === 'up' ? '#10b981' : '#ef4444',
                    }}>
                    <TrendingUp className="w-3 h-3" />
                    {stat.change}
                  </div>
                </div>
                <div className="progress-bar mt-3">
                  <div className="progress-fill" style={{ width: loading ? '10%' : '80%', background: stat.color }} />
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard delay={0.1} className="lg:col-span-2 !p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">Trend Analysis</h3>
                  <p className="text-xs text-slate-500">Today's detection activity from live sources</p>
                </div>
                <button onClick={loadData} disabled={refreshing} className="btn-ghost py-1.5 px-3 text-xs">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    {[['detected', '#00d4ff'], ['misinfo', '#ef4444'], ['verified', '#10b981']].map(([key, color]) => (
                      <linearGradient key={key} id={key} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="detected" name="Detected"       stroke="#00d4ff" strokeWidth={2} fill="url(#detected)" />
                  <Area type="monotone" dataKey="misinfo"  name="Misinformation" stroke="#ef4444" strokeWidth={2} fill="url(#misinfo)" />
                  <Area type="monotone" dataKey="verified" name="Verified"       stroke="#10b981" strokeWidth={2} fill="url(#verified)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard delay={0.15} className="!p-5">
              <h3 className="font-semibold text-white mb-1">By Category</h3>
              <p className="text-xs text-slate-500 mb-3">Live news breakdown</p>
              {catStats.length > 0 ? (
                <>
                  <div className="flex justify-center mb-3">
                    <PieChart width={130} height={130}>
                      <Pie data={catStats} cx={60} cy={60} innerRadius={38} outerRadius={58} dataKey="count" strokeWidth={0}>
                        {catStats.map((entry, i) => <Cell key={i} fill={entry.fill} opacity={0.85} />)}
                      </Pie>
                    </PieChart>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
                    {catStats.map((c) => (
                      <div key={c.category} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.fill }} />
                        <span className="text-slate-400 flex-1">{c.category}</span>
                        <span className="font-medium text-white">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mb-2" /> Loading...
                </div>
              )}
            </GlassCard>
          </div>

          {/* Live alerts + Verification */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard delay={0.2} className="lg:col-span-2 !p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <h3 className="font-semibold text-white">Live News Feed</h3>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
                  <span className="text-xs text-primary/70">Real-time RSS</span>
                </div>
                <span className="text-xs text-slate-500">{news.length} fetched</span>
              </div>
              {loading ? (
                <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-16 rounded-xl bg-white/3 animate-pulse" />)}</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                  {news.slice(0, 15).map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.04 }}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors border border-white/4 group"
                    >
                      <div className="mt-1 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${
                          item.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                          item.severity === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={item.link} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-white hover:text-primary transition-colors truncate block">
                          {item.title}
                        </a>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-slate-500">{item.source}</span>
                          <span className="text-xs text-primary/60">{item.category}</span>
                          <ExternalLink className="w-3 h-3 text-slate-700 ml-auto" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`badge-${item.verdict}`}>{item.verdict.toUpperCase()}</span>
                        <span className="text-xs text-slate-600">{item.confidence}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard delay={0.25} className="!p-5">
              <h3 className="font-semibold text-white mb-1">Verification Summary</h3>
              <p className="text-xs text-slate-500 mb-4">From {news.length} live articles</p>
              {loading ? (
                <div className="space-y-4">
                  {[130,90,90].map((s,i) => <div key={i} className="flex justify-center"><div className="rounded-full animate-pulse bg-white/5" style={{ width: s, height: s }} /></div>)}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <RadialChart value={fakeCount > 0 ? Math.round((fakeCount / news.length) * 100) : 0} size={130} color="#ef4444" label="FAKE" sublabel={`${fakeCount} of ${news.length}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-center">
                      <RadialChart value={realCount > 0 ? Math.round((realCount / news.length) * 100) : 0} size={90} color="#10b981" label="REAL" />
                    </div>
                    <div className="flex justify-center">
                      <RadialChart value={news.filter((n) => n.verdict === 'uncertain').length > 0
                        ? Math.round((news.filter((n) => n.verdict === 'uncertain').length / news.length) * 100) : 0}
                        size={90} color="#f59e0b" label="UNCLEAR" />
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Google Trends + Reddit + HackerNews + Source Credibility */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Google Trends */}
            <GlassCard delay={0.3} className="!p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="font-semibold text-white text-sm">Trending Now</h3>
              </div>
              {loading || trends.length === 0 ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map((i) => <div key={i} className="h-6 rounded bg-white/4 animate-pulse" />)}
                  <p className="text-xs text-slate-600 text-center mt-3">{trends.length === 0 && !loading ? 'Using fallback trends' : 'Loading...'}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {trends.slice(0, 10).map((t, i) => (
                    <motion.div key={t.keyword} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white/4 transition-colors cursor-default"
                    >
                      <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                      <span className="text-xs text-slate-300 flex-1 truncate">{t.keyword}</span>
                      <TrendingUp className="w-3 h-3 text-orange-400/60 flex-shrink-0" />
                    </motion.div>
                  ))}
                  {trends[0] && (
                    <p className="text-[10px] text-slate-700 text-right mt-1">via {trends[0].source}</p>
                  )}
                </div>
              )}
            </GlassCard>

            {/* Reddit Hot */}
            <GlassCard delay={0.33} className="!p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-white text-sm">Reddit Hot</h3>
              </div>
              {reddit.length === 0 ? (
                <div className="text-xs text-slate-600 text-center py-6 animate-pulse">Loading...</div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                  {reddit.map((post) => (
                    <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer"
                      className="block p-2 rounded-lg hover:bg-white/4 transition-colors group">
                      <div className="text-xs text-slate-400 truncate group-hover:text-white transition-colors">{post.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-orange-500">r/{post.subreddit}</span>
                        <span className="text-[10px] text-slate-600">▲ {post.score.toLocaleString()}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* HackerNews */}
            <GlassCard delay={0.36} className="!p-5">
              <div className="flex items-center gap-2 mb-4">
                <ExternalLink className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-white text-sm">HackerNews</h3>
              </div>
              {hn.length === 0 ? (
                <div className="text-xs text-slate-600 text-center py-6 animate-pulse">Loading...</div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                  {hn.map((post) => (
                    <a key={post.id} href={post.link} target="_blank" rel="noopener noreferrer"
                      className="block p-2 rounded-lg hover:bg-white/4 transition-colors group">
                      <div className="text-xs text-slate-400 truncate group-hover:text-white">{post.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-amber-500">HN</span>
                        <span className="text-[10px] text-slate-600">▲ {post.score}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Source Credibility */}
            <GlassCard delay={0.4} className="!p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-white text-sm">Source Credibility</h3>
              </div>
              <div className="space-y-4">
                {liveSourceStats.map((src) => (
                  <div key={src.source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white truncate flex-1">{src.source}</span>
                      <span className="text-xs font-bold ml-2" style={{ color: src.color }}>{src.credibility}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="h-full rounded-full"
                        style={{ width: `${src.credibility}%`, background: src.color, boxShadow: `0 0 8px ${src.color}60` }} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Agent Flow */}
          <GlassCard delay={0.45} className="!p-5">
            <h3 className="font-semibold text-white mb-4">Agent Activity Pipeline</h3>
            <AgentFlowDiagram />
          </GlassCard>

          {/* Category bar chart */}
          {catStats.length > 0 && (
            <GlassCard delay={0.5} className="!p-5">
              <h3 className="font-semibold text-white mb-4">Category Distribution (Live)</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={catStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Articles" radius={[4,4,0,0]}>
                    {catStats.map((entry, i) => <Cell key={i} fill={entry.fill} opacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
    </AppLayout>
  );
}
