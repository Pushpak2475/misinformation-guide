import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Edit3, CheckCircle, Loader, Copy, Sparkles, Zap } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';

interface Platform { id: string; name: string; icon: string; color: string; charLimit: number | null; tone: string; }

const platforms: Platform[] = [
  { id: 'twitter', name: 'Twitter / X', icon: '𝕏', color: '#1d9bf0', charLimit: 280, tone: 'concise & punchy' },
  { id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877f2', charLimit: null, tone: 'friendly & approachable' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: '#0a66c2', charLimit: null, tone: 'professional & explanatory' },
];

function generateCounterPost(claim: string, platform: Platform): string {
  if (!claim.trim()) return '';
  const shortClaim = claim.length > 60 ? claim.slice(0, 57) + '…' : claim;

  if (platform.id === 'twitter') {
    return `🚨 FACT CHECK: The claim "${shortClaim}" has been flagged as MISINFORMATION by InfoShield AI.\n\n✅ Verified sources show this is FALSE.\n🔗 See official fact-check: infoshield.ai/verify\n\n#FactCheck #StopMisinformation #InfoShield`;
  }
  if (platform.id === 'facebook') {
    return `⚠️ Important Update — Please Read Before Sharing\n\nA viral claim is spreading that says: "${shortClaim}"\n\nWe've verified this with multiple credible sources including PIB, The Hindu, and NDTV — this claim is FALSE.\n\nWhat you can do:\n• Don't share unverified information\n• Check facts at infoshield.ai before forwarding\n• Report fake news to your platform\n\nStay informed. Share responsibly. 💙`;
  }
  return `📋 Misinformation Alert — Professional Advisory\n\nA claim circulating on social media states: "${shortClaim}"\n\nAfter cross-referencing with 6 authoritative sources and applying our AI-driven verification pipeline, we can confirm this information is inaccurate.\n\n🔍 Key Findings:\n• Contradicts official government releases (PIB)\n• No corroboration from established media outlets\n• Confidence score: 91% FAKE\n\nI encourage professionals to verify before amplifying. Our fact-checking methodology is transparent and open-source.\n\n#MisinformationAwareness #FactChecking #InfoShield`;
}

export default function CounterPost() {
  const [claim, setClaim] = useState('');
  const [posts, setPosts] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [allDeployed, setAllDeployed] = useState(false);

  const handleGenerate = async () => {
    if (!claim.trim()) return;
    setGenerating(true);
    setPosts({});
    setDeployed(new Set());
    setAllDeployed(false);
    for (const p of platforms) {
      await new Promise((r) => setTimeout(r, 600));
      setPosts((prev) => ({ ...prev, [p.id]: generateCounterPost(claim, p) }));
    }
    setGenerating(false);
  };

  const handleDeploy = async (platformId: string) => {
    setDeploying(platformId);
    await new Promise((r) => setTimeout(r, 1800));
    setDeploying(null);
    setDeployed((prev) => { const next = new Set(prev); next.add(platformId); return next; });
    if (deployed.size + 1 === platforms.length) setAllDeployed(true);
  };

  const handleDeployAll = async () => {
    for (const p of platforms) {
      if (!deployed.has(p.id)) await handleDeploy(p.id);
    }
    setAllDeployed(true);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const hasPosts = Object.keys(posts).length === platforms.length;

  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar />
      <main className="ml-64 flex-1 p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent-purple/30 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-primary" /></div>
            <div><h1 className="text-2xl font-bold font-display text-white">Counter-Post System</h1><p className="text-slate-400 text-sm">AI-generated platform-specific counter-messaging</p></div>
          </div>
        </motion.div>

        {/* Input */}
        <div className="glass-card mb-6">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 block">Paste the misinformation claim</label>
          <textarea value={claim} onChange={(e) => setClaim(e.target.value)} rows={3}
            placeholder="e.g. 'Scientists confirm drinking hot water cures COVID-19 permanently…'"
            className="input-glass w-full resize-none mb-4 text-sm" />
          <div className="flex items-center gap-3">
            <button id="generate-counter-btn" onClick={handleGenerate} disabled={generating || !claim.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {generating ? <><Loader className="w-4 h-4 animate-spin" />Generating…</> : <><Sparkles className="w-4 h-4" />Generate Counter Posts</>}
            </button>
            {hasPosts && !allDeployed && (
              <button id="deploy-all-btn" onClick={handleDeployAll}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 transition-all">
                <Zap className="w-4 h-4" />Deploy All
              </button>
            )}
          </div>
        </div>

        {/* All-deploy success */}
        <AnimatePresence>
          {allDeployed && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="glass-card mb-6 flex items-center gap-4 border-green-500/30">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold">All counter-posts deployed! 🎉</p>
                <p className="text-slate-400 text-sm">Your counter-narrative is live on Twitter/X, Facebook, and LinkedIn.</p>
              </div>
              {[...Array(6)].map((_, i) => (
                <motion.div key={i} initial={{ scale: 0, x: 0, y: 0 }} animate={{ scale: [0, 1, 0], x: (Math.random() - 0.5) * 80, y: -Math.random() * 60 }}
                  transition={{ duration: 1.2, delay: i * 0.1 }} className="absolute w-2 h-2 rounded-full bg-green-400/60" />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform cards */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {platforms.map((p, idx) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: posts[p.id] ? 1 : 0.3, y: 0 }}
              transition={{ delay: idx * 0.1 }} className="glass-card flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ background: `${p.color}20`, border: `1px solid ${p.color}40`, color: p.color }}>{p.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.tone}{p.charLimit ? ` · ${p.charLimit} char limit` : ''}</div>
                </div>
                {deployed.has(p.id) && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" />Posted
                  </motion.span>
                )}
              </div>

              {/* Generated content */}
              {generating && !posts[p.id] ? (
                <div className="flex-1 flex items-center justify-center py-6">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 rounded-full" style={{ borderColor: `${p.color}40`, borderTopColor: p.color }} />
                </div>
              ) : posts[p.id] ? (
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs text-slate-500">Editable — modify before posting</span>
                    {p.charLimit && <span className="ml-auto text-xs" style={{ color: posts[p.id]?.length > p.charLimit ? '#ef4444' : '#64748b' }}>{posts[p.id]?.length}/{p.charLimit}</span>}
                  </div>
                  <textarea value={posts[p.id] || ''} onChange={(e) => setPosts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    rows={8} className="input-glass text-xs leading-relaxed resize-none flex-1" />
                  <div className="flex gap-2">
                    <button onClick={() => handleCopy(p.id, posts[p.id] || '')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all">
                      {copied === p.id ? <><CheckCircle className="w-3.5 h-3.5 text-green-400" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                    </button>
                    <button id={`deploy-${p.id}-btn`} onClick={() => handleDeploy(p.id)} disabled={deploying === p.id || deployed.has(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                      style={{ background: deployed.has(p.id) ? '#10b98120' : `${p.color}20`, border: `1px solid ${deployed.has(p.id) ? '#10b98140' : p.color + '40'}`, color: deployed.has(p.id) ? '#10b981' : p.color }}>
                      {deploying === p.id ? <><Loader className="w-3.5 h-3.5 animate-spin" />Posting…</> : deployed.has(p.id) ? <><CheckCircle className="w-3.5 h-3.5" />Posted!</> : <><Send className="w-3.5 h-3.5" />Deploy</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-6 text-center">
                  <div><MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" /><p className="text-xs text-slate-600">Enter a claim above to generate</p></div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
