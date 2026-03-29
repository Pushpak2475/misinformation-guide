import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Rss, CheckCircle, AlertTriangle, Star, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';

interface Source { id: string; name: string; type: 'social' | 'news'; platform: string; icon: string; credibility: number; verified: boolean; lastIngested: string; articleCount: number; description: string; color: string; }

const sources: Source[] = [
  { id: 's1', name: 'Twitter/X', type: 'social', platform: 'Twitter', icon: '𝕏', credibility: 52, verified: false, lastIngested: '2 min ago', articleCount: 14820, description: 'Real-time social media posts and trending topics', color: '#1d9bf0' },
  { id: 's2', name: 'Reddit', type: 'social', platform: 'Reddit', icon: '🔴', credibility: 61, verified: false, lastIngested: '5 min ago', articleCount: 8432, description: 'Community discussions, AMAs, and crowdsourced fact-checks', color: '#ff4500' },
  { id: 's3', name: 'Facebook', type: 'social', platform: 'Facebook', icon: 'f', credibility: 48, verified: false, lastIngested: '8 min ago', articleCount: 22100, description: 'Public posts, groups, and viral shares', color: '#1877f2' },
  { id: 's4', name: 'YouTube', type: 'social', platform: 'YouTube', icon: '▶', credibility: 55, verified: false, lastIngested: '12 min ago', articleCount: 5640, description: 'Video metadata and comment sentiment analysis (simulated)', color: '#ff0000' },
  { id: 's5', name: 'The Hindu', type: 'news', platform: 'The Hindu', icon: '📖', credibility: 94, verified: true, lastIngested: '10 min ago', articleCount: 3240, description: 'One of India\'s oldest and most trusted English dailies', color: '#dc2626' },
  { id: 's6', name: 'Indian Express', type: 'news', platform: 'Indian Express', icon: '📰', credibility: 92, verified: true, lastIngested: '15 min ago', articleCount: 2870, description: 'National English newspaper with strong investigative journalism', color: '#b45309' },
  { id: 's7', name: 'NDTV', type: 'news', platform: 'NDTV', icon: '📺', credibility: 88, verified: true, lastIngested: '7 min ago', articleCount: 4120, description: 'Leading 24-hour news channel with digital presence', color: '#7c3aed' },
  { id: 's8', name: 'PIB India', type: 'news', platform: 'PIB', icon: '🏛️', credibility: 99, verified: true, lastIngested: '20 min ago', articleCount: 1890, description: 'Press Information Bureau — Official Government of India releases', color: '#059669' },
  { id: 's9', name: 'Times of India', type: 'news', platform: 'TOI', icon: '🗞️', credibility: 85, verified: true, lastIngested: '18 min ago', articleCount: 5580, description: 'World\'s largest English-language daily by circulation', color: '#ea580c' },
];

function CredibilityBar({ score }: { score: number }) {
  const color = score >= 85 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, delay: 0.2 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function SourceCard({ src, index }: { src: Source; index: number }) {
  const [syncing, setSyncing] = useState(false);
  const handleSync = () => { setSyncing(true); setTimeout(() => setSyncing(false), 2000); };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      className="glass-card hover:border-primary/30 transition-all group">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 text-white"
          style={{ background: `${src.color}25`, border: `1px solid ${src.color}40` }}>
          {src.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white text-sm">{src.name}</span>
            {src.verified
              ? <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Verified</span>
              : <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />Unverified</span>}
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${src.type === 'news' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
              {src.type === 'news' ? '📰 News' : '💬 Social'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3 line-clamp-1">{src.description}</p>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 flex items-center gap-1"><Star className="w-3 h-3" />Credibility Score</span>
            </div>
            <CredibilityBar score={src.credibility} />
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Database className="w-3 h-3" />{src.articleCount.toLocaleString()} articles</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last sync: {src.lastIngested}</span>
            <button onClick={handleSync} className="ml-auto flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button className="flex items-center gap-1 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white">
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SourcesPanel() {
  const [filter, setFilter] = useState<'all' | 'social' | 'news'>('all');
  const [search, setSearch] = useState('');
  const shown = sources.filter((s) => (filter === 'all' || s.type === filter) && s.name.toLowerCase().includes(search.toLowerCase()));
  const avgCredSocial = Math.round(sources.filter((s) => s.type === 'social').reduce((a, s) => a + s.credibility, 0) / 4);
  const avgCredNews = Math.round(sources.filter((s) => s.type === 'news').reduce((a, s) => a + s.credibility, 0) / 5);

  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />
      <main className="ml-64 flex-1 p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent-purple/30 flex items-center justify-center"><Database className="w-5 h-5 text-primary" /></div>
            <div><h1 className="text-2xl font-bold font-display text-white">Data Sources</h1><p className="text-slate-400 text-sm">Social media + trusted Indian news ingestion pipeline</p></div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Sources', value: '9', icon: Database, color: 'text-primary' },
            { label: 'Social Avg Score', value: `${avgCredSocial}/100`, icon: Rss, color: 'text-purple-400' },
            { label: 'News Avg Score', value: `${avgCredNews}/100`, icon: CheckCircle, color: 'text-green-400' },
            { label: 'Articles Today', value: '68.7K', icon: RefreshCw, color: 'text-yellow-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex gap-2 p-1 glass rounded-xl">
            {(['all', 'social', 'news'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-primary text-dark' : 'text-slate-400 hover:text-white'}`}>
                {f === 'all' ? 'All Sources' : f === 'social' ? '💬 Social Media' : '📰 Trusted News'}
              </button>
            ))}
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sources…"
            className="input-glass max-w-xs py-2 text-sm" />
        </div>

        <AnimatePresence>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {shown.map((src, i) => <SourceCard key={src.id} src={src} index={i} />)}
          </div>
        </AnimatePresence>
      </main>
    </div>
  );
}
