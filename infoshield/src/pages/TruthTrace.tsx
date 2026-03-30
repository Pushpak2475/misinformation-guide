import { useState, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Search, ChevronRight, AlertTriangle, CheckCircle, XCircle, Loader, Info, Clock } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';

interface TraceNode {
  id: string;
  label: string;
  type: 'origin' | 'relay' | 'mutation' | 'viral' | 'debunk';
  platform: string;
  timestamp: string;
  confidence: number;
  description: string;
  mutation?: string;
}

const exampleTraces: Record<string, TraceNode[]> = {
  default: [
    { id: 'n1', label: 'WhatsApp Group (Private)', type: 'origin', platform: 'WhatsApp', timestamp: 'Mar 20, 2026 · 2:14 PM', confidence: 72, description: 'First known appearance of the claim in a private group of 247 members. Unverified screenshot shared.' },
    { id: 'n2', label: 'Telegram Channel @newsflash_india', type: 'relay', platform: 'Telegram', timestamp: 'Mar 20, 2026 · 4:38 PM', confidence: 65, description: 'Content relayed to public Telegram channel with 1.2M subscribers. Original context stripped.' },
    { id: 'n3', label: 'Twitter/X @viral_news_india', type: 'mutation', platform: 'Twitter', timestamp: 'Mar 21, 2026 · 9:02 AM', confidence: 41, description: 'Key modification: Original \'might\' changed to \'confirmed\'. Claim now presented as fact. 8,400 retweets.', mutation: '"Might cause" → "Officially confirmed"' },
    { id: 'n4', label: 'Facebook Pages · 14 pages', type: 'viral', platform: 'Facebook', timestamp: 'Mar 21, 2026 · 11:45 AM', confidence: 28, description: 'Explosive spread across 14 Facebook pages. Total reach: ~2.8M users. 62,000+ shares.' },
    { id: 'n5', label: 'Reddit r/india & r/IndiaNews', type: 'relay', platform: 'Reddit', timestamp: 'Mar 21, 2026 · 2:17 PM', confidence: 29, description: 'Top post on r/india with 4,200 upvotes. Community begins questioning authenticity.' },
    { id: 'n6', label: 'PIB Fact Check — DEBUNKED', type: 'debunk', platform: 'PIB', timestamp: 'Mar 22, 2026 · 10:00 AM', confidence: 99, description: 'Official PIB fact-check issued. Claim rated FALSE. Supported by Ministry statement.' },
  ],
};

const nodeColors: Record<string, string> = {
  origin: '#f59e0b',
  relay: '#3b82f6',
  mutation: '#ef4444',
  viral: '#ec4899',
  debunk: '#10b981',
};

const nodeIcons: Record<string, ElementType> = {
  origin: AlertTriangle,
  relay: ChevronRight,
  mutation: XCircle,
  viral: AlertTriangle,
  debunk: CheckCircle,
};

const nodeLabels: Record<string, string> = {
  origin: 'Origin',
  relay: 'Relay',
  mutation: 'Mutation ⚠️',
  viral: 'Viral Spread',
  debunk: 'Debunked ✓',
};

function NodeCard({ node, index, active, onClick }: { node: TraceNode; index: number; active: boolean; onClick: () => void }) {
  const color = nodeColors[node.type];
  const Icon = nodeIcons[node.type];
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.12 }}
      className="flex gap-4 cursor-pointer group" onClick={onClick}>
      {/* Timeline spine */}
      <div className="flex flex-col items-center gap-0">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: index * 0.12 + 0.1, type: 'spring' }}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{ background: `${color}20`, border: `2px solid ${active ? color : color + '60'}`, boxShadow: active ? `0 0 20px ${color}50` : 'none' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </motion.div>
        {index < Object.values(exampleTraces.default).length - 1 && (
          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: index * 0.12 + 0.3, duration: 0.5 }}
            className="w-0.5 h-12 origin-top" style={{ background: `linear-gradient(to bottom, ${color}60, ${nodeColors[exampleTraces.default[index + 1]?.type] || '#ffffff20'})` }} />
        )}
      </div>
      {/* Content */}
      <div className={`flex-1 glass-card mb-2 transition-all duration-200 ${active ? 'border-opacity-60' : 'hover:border-white/20'}`}
        style={{ borderColor: active ? color + '60' : undefined, boxShadow: active ? `0 0 20px ${color}15` : undefined }}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                {nodeLabels[node.type]}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{node.timestamp}</span>
              <span className="ml-auto text-xs font-bold" style={{ color: node.confidence > 70 ? '#10b981' : node.confidence > 45 ? '#f59e0b' : '#ef4444' }}>
                {node.confidence}% conf.
              </span>
            </div>
            <p className="text-white text-sm font-semibold mb-1">{node.label}</p>
            {node.mutation && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 mb-2 font-mono">
                🔄 {node.mutation}
              </motion.div>
            )}
            <p className="text-xs text-slate-400 leading-relaxed">{node.description}</p>
          </div>
        </div>
        {/* Confidence drop */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-600">Confidence:</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${node.confidence}%` }} transition={{ duration: 0.8, delay: index * 0.12 + 0.2 }}
              className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
          </div>
          <span className="text-xs font-bold" style={{ color }}>{node.confidence}%</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function TruthTrace() {
  const [query, setQuery] = useState('');
  const [tracing, setTracing] = useState(false);
  const [traced, setTraced] = useState(false);
  const [nodes, setNodes] = useState<TraceNode[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const handleTrace = async () => {
    if (!query.trim()) return;
    setTracing(true);
    setTraced(false);
    setNodes([]);
    setActiveNode(null);
    await new Promise((r) => setTimeout(r, 1600));
    setNodes(exampleTraces.default);
    setTraced(true);
    setTracing(false);
  };

  const mutations = nodes.filter((n) => n.type === 'mutation').length;
  const origin = nodes[0];
  const debunk = nodes.find((n) => n.type === 'debunk');

  return (
    <AppLayout title="Truth Trace Timeline" subtitle="Backtrack misinformation to its origin source, trace every mutation">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/30 to-red-500/30 flex items-center justify-center"><GitBranch className="w-5 h-5 text-yellow-400" /></div>
            <div><h1 className="text-2xl font-bold font-display text-white">Truth Trace Timeline</h1><p className="text-slate-400 text-sm">Backtrack misinformation to its origin source, trace every mutation</p></div>
          </div>
        </motion.div>

        {/* Input */}
        <div className="glass-card mb-6">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 block">Enter claim or URL to trace</label>
          <div className="flex gap-3">
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTrace()}
              placeholder="e.g. 'Drinking hot water cures COVID-19' or paste a URL…"
              className="input-glass flex-1 text-sm" />
            <button id="trace-btn" onClick={handleTrace} disabled={tracing || !query.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
              {tracing ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {tracing ? 'Tracing…' : 'Trace Origin'}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2 flex items-center gap-1"><Info className="w-3 h-3" />AI analyses the propagation chain across WhatsApp, Telegram, Twitter, Facebook, and news sources.</p>
        </div>

        {/* Loading */}
        <AnimatePresence>
          {tracing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card mb-6 text-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full mx-auto mb-4" />
              <p className="text-white font-semibold">Backtracking propagation chain…</p>
              <p className="text-slate-500 text-sm mt-1">Analysing 6 platforms · Cross-referencing timestamps · Detecting mutations</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary stats */}
        <AnimatePresence>
          {traced && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Chain Length', value: `${nodes.length} hops`, color: 'text-primary' },
                { label: 'Mutations Found', value: `${mutations}`, color: 'text-red-400' },
                { label: 'First Platform', value: origin?.platform ?? '—', color: 'text-yellow-400' },
                { label: 'Status', value: debunk ? 'DEBUNKED' : 'ACTIVE', color: debunk ? 'text-green-400' : 'text-red-400' },
              ].map((s) => (
                <div key={s.label} className="glass-card text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline */}
        {traced && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <GitBranch className="w-4 h-4" />Propagation Chain
            </h2>
            {nodes.map((node, i) => (
              <NodeCard key={node.id} node={node} index={i} active={activeNode === node.id} onClick={() => setActiveNode(activeNode === node.id ? null : node.id)} />
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {!tracing && !traced && (
          <div className="glass-card text-center py-16">
            <GitBranch className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">Enter a claim above to trace its origin</p>
            <p className="text-slate-600 text-sm mt-2">The AI will construct a full propagation timeline showing where the misinformation came from, how it mutated, and how far it spread.</p>
          </div>
        )}
    </AppLayout>
  );
}
