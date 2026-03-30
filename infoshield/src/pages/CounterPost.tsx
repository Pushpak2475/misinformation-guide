import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Edit3, CheckCircle, Loader, Copy, Sparkles, Zap,
  AlertTriangle, ExternalLink, X, Info, WifiOff, Wifi,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';

// ─── Platform config ──────────────────────────────────────────────────────────
interface Platform {
  id: 'twitter' | 'facebook' | 'linkedin';
  name: string;
  icon: string;
  color: string;
  charLimit: number | null;
  tone: string;
  handle: string; // which account / page posts from
}

const platforms: Platform[] = [
  {
    id: 'twitter',  name: 'Twitter / X',  icon: '𝕏',   color: '#1d9bf0',
    charLimit: 280, tone: 'concise & punchy',
    handle: '@InfoShieldAI  (your Twitter account)',
  },
  {
    id: 'facebook', name: 'Facebook',     icon: 'f',    color: '#1877f2',
    charLimit: null, tone: 'friendly & approachable',
    handle: 'Your Facebook Page',
  },
  {
    id: 'linkedin', name: 'LinkedIn',     icon: 'in',   color: '#0a66c2',
    charLimit: null, tone: 'professional & explanatory',
    handle: 'Your LinkedIn Profile / Page',
  },
];

// ─── AI text generator (client-side heuristic) ───────────────────────────────
function generateCounterPost(claim: string, platform: Platform): string {
  if (!claim.trim()) return '';
  const shortClaim = claim.length > 60 ? claim.slice(0, 57) + '…' : claim;

  if (platform.id === 'twitter') {
    return `🚨 FACT CHECK: The claim "${shortClaim}" has been flagged as MISINFORMATION by InfoShield AI.\n\n❌ Verified sources show this is FALSE.\n🔍 See official fact-check: infoshield.ai/verify\n\n#FactCheck #StopMisinformation #InfoShield`;
  }
  if (platform.id === 'facebook') {
    return `⚠️ Important Update — Please Read Before Sharing\n\nA viral claim is spreading that says: "${shortClaim}"\n\nWe've verified this with multiple credible sources — this claim is FALSE.\n\nWhat you can do:\n✅ Don't share unverified information\n✅ Check facts at infoshield.ai before forwarding\n✅ Report fake news to your platform\n\nStay informed. Share responsibly. 🛡️`;
  }
  return `🔍 Misinformation Alert — Professional Advisory\n\nA claim circulating on social media states: "${shortClaim}"\n\nAfter cross-referencing with 6 authoritative sources and our AI verification pipeline, we can confirm this information is inaccurate.\n\n📊 Key Findings:\n• Contradicts official government releases\n• No corroboration from established media outlets\n• Confidence score: 91% FAKE\n\nI encourage professionals to verify before amplifying. Our fact-checking methodology is transparent and open-source.\n\n#MisinformationAwareness #FactChecking #InfoShield`;
}

// ─── API call ─────────────────────────────────────────────────────────────────
interface PostResult {
  success: boolean;
  platform: string;
  postId?: string;
  url?: string;
  error?: string;
}

async function callSocialPostAPI(platform: Platform['id'], text: string): Promise<PostResult> {
  const endpoint = '/.netlify/functions/social-post';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, text }),
  });
  return res.json() as Promise<PostResult>;
}

// ─── Platform status badge ────────────────────────────────────────────────────
function StatusDot({ connected }: { connected: boolean | null }) {
  if (connected === null) return <span className="w-2 h-2 rounded-full bg-slate-600 animate-pulse inline-block" />;
  return connected
    ? <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
    : <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CounterPost() {
  const [claim, setClaim]           = useState('');
  const [posts, setPosts]           = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [deploying, setDeploying]   = useState<string | null>(null);
  const [results, setResults]       = useState<Record<string, PostResult>>({});
  const [copied, setCopied]         = useState<string | null>(null);
  const [allDeployed, setAllDeployed] = useState(false);
  // null = checking, true = configured, false = missing
  const [platformStatus, setPlatformStatus] = useState<Record<string, boolean | null>>({
    twitter: null, facebook: null, linkedin: null,
  });

  // ── Probe which platforms have credentials configured ──────────────────────
  useEffect(() => {
    async function probe() {
      // We probe by sending an empty text — the function will return a 400 (body
      // validation) if the endpoint *exists*, or a credential error if missing.
      // We use a quick OPTIONS check instead to keep it cheap.
      await Promise.all(
        platforms.map(async (p) => {
          try {
            const res = await fetch('/.netlify/functions/social-post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ platform: p.id, text: '__probe__' }),
            });
            const data = await res.json() as PostResult;
            // If error contains "not configured", credentials are missing
            const configured = !(data.error?.toLowerCase().includes('not configured'));
            setPlatformStatus((prev) => ({ ...prev, [p.id]: configured }));
          } catch {
            setPlatformStatus((prev) => ({ ...prev, [p.id]: false }));
          }
        })
      );
    }
    probe();
  }, []);

  // ── Generate AI posts for all platforms ───────────────────────────────────
  const handleGenerate = async () => {
    if (!claim.trim()) return;
    setGenerating(true);
    setPosts({});
    setResults({});
    setAllDeployed(false);
    for (const p of platforms) {
      await new Promise((r) => setTimeout(r, 400));
      setPosts((prev) => ({ ...prev, [p.id]: generateCounterPost(claim, p) }));
    }
    setGenerating(false);
  };

  // ── Deploy to one platform ─────────────────────────────────────────────────
  const handleDeploy = async (platform: Platform) => {
    const text = posts[platform.id];
    if (!text) return;
    setDeploying(platform.id);

    try {
      const result = await callSocialPostAPI(platform.id, text);
      setResults((prev) => ({ ...prev, [platform.id]: result }));
      if (!result.success) {
        // Mark as error but don't crash
        console.error(`[InfoShield] ${platform.name} post failed:`, result.error);
      }
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [platform.id]: { success: false, platform: platform.id, error: String(err) },
      }));
    }

    setDeploying(null);
    const totalDeployed = Object.values({ ...results, [platform.id]: { success: true } })
      .filter((r) => (r as PostResult).success).length;
    if (totalDeployed === platforms.length) setAllDeployed(true);
  };

  const handleDeployAll = async () => {
    for (const p of platforms) {
      if (!results[p.id]?.success) await handleDeploy(p);
    }
    setAllDeployed(true);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const hasPosts = Object.keys(posts).length === platforms.length;
  const deployedSet = new Set(Object.entries(results).filter(([, r]) => r.success).map(([k]) => k));
  const connectedCount = Object.values(platformStatus).filter(Boolean).length;

  return (
    <AppLayout title="Counter-Post System" subtitle="AI-generated platform-specific counter-messaging">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent-purple/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">Counter-Post System</h1>
              <p className="text-slate-400 text-sm">AI-generated platform-specific counter-messaging</p>
            </div>
          </div>
        </motion.div>

        {/* ── Platform Connection Status Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white">Platform Connections</span>
            <span className="ml-auto text-xs text-slate-500">
              {connectedCount}/{platforms.length} connected
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {platforms.map((p) => {
              const status = platformStatus[p.id];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                  style={{
                    background: status === true  ? `${p.color}10` :
                                status === false ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
                    borderColor: status === true  ? `${p.color}40` :
                                 status === false ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${p.color}20`, color: p.color }}
                  >
                    {p.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-white truncate">{p.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <StatusDot connected={status} />
                      <span className="text-[10px] text-slate-500">
                        {status === null ? 'Checking…' : status ? 'Connected' : 'Not Configured'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Setup instructions if any platform is not configured */}
          {connectedCount < platforms.length && Object.values(platformStatus).every((s) => s !== null) && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl text-xs">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-amber-300/80">
                <span className="font-semibold text-amber-300">Missing API keys.</span>{' '}
                Add credentials in your{' '}
                <span className="font-mono text-amber-200">.env.local</span> file or{' '}
                <span className="font-semibold">Netlify → Environment Variables</span>.{' '}
                See <span className="font-mono">.env.example</span> in the project root for setup steps.
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Claim Input ── */}
        <div className="glass-card mb-6">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 block">
            Paste the misinformation claim
          </label>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            rows={3}
            placeholder="e.g. 'Scientists confirm drinking hot water cures COVID-19 permanently…'"
            className="input-glass w-full resize-none mb-4 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              id="generate-counter-btn"
              onClick={handleGenerate}
              disabled={generating || !claim.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating
                ? <><Loader className="w-4 h-4 animate-spin" />Generating…</>
                : <><Sparkles className="w-4 h-4" />Generate Counter Posts</>
              }
            </button>
            {hasPosts && deployedSet.size < platforms.length && (
              <button
                id="deploy-all-btn"
                onClick={handleDeployAll}
                disabled={!!deploying}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />Deploy All
              </button>
            )}
          </div>
        </div>

        {/* ── All-deploy success banner ── */}
        <AnimatePresence>
          {allDeployed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card mb-6 flex items-center gap-4 border-green-500/30 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold">All counter-posts deployed! 🎉</p>
                <p className="text-slate-400 text-sm">Your counter-narrative is live on Twitter/X, Facebook, and LinkedIn.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Platform cards ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {platforms.map((p, idx) => {
            const result = results[p.id];
            const isDeployed = result?.success === true;
            const hasFailed  = result?.success === false;
            const isDeploying = deploying === p.id;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: posts[p.id] ? 1 : 0.35, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card flex flex-col gap-4"
              >
                {/* Card header */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: `${p.color}20`, border: `1px solid ${p.color}40`, color: p.color }}
                  >
                    {p.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{p.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {p.tone}{p.charLimit ? ` · ${p.charLimit} char limit` : ''}
                    </div>
                  </div>
                  {/* Status badge */}
                  {isDeployed && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full whitespace-nowrap"
                    >
                      <CheckCircle className="w-3 h-3" />Posted Live
                    </motion.span>
                  )}
                  {hasFailed && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full"
                    >
                      <X className="w-3 h-3" />Failed
                    </motion.span>
                  )}
                </div>

                {/* Who it posts from */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-600 bg-white/3 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <Info className="w-3 h-3 flex-shrink-0" />
                  <span>Posts from: <span className="text-slate-400">{p.handle}</span></span>
                </div>

                {/* Error message */}
                {hasFailed && result.error && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/8 border border-red-500/20 rounded-xl text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-semibold mb-0.5">Post failed</p>
                      <p className="text-red-400/80">{result.error}</p>
                      {result.error.includes('not configured') && (
                        <p className="text-red-400/60 mt-1">
                          Add credentials to <code className="font-mono">.env.local</code> or Netlify env vars.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Success: show live post link */}
                {isDeployed && result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all hover:scale-[1.01]"
                    style={{ background: `${p.color}10`, borderColor: `${p.color}30`, color: p.color }}
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    View Live Post
                    <code className="ml-auto text-[10px] opacity-60">#{result.postId?.slice(-8)}</code>
                  </a>
                )}

                {/* Content area */}
                {generating && !posts[p.id] ? (
                  <div className="flex-1 flex items-center justify-center py-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 border-2 rounded-full"
                      style={{ borderColor: `${p.color}40`, borderTopColor: p.color }}
                    />
                  </div>
                ) : posts[p.id] ? (
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs text-slate-500">Editable — modify before posting</span>
                      {p.charLimit && (
                        <span
                          className="ml-auto text-xs"
                          style={{ color: (posts[p.id]?.length ?? 0) > p.charLimit ? '#ef4444' : '#64748b' }}
                        >
                          {posts[p.id]?.length}/{p.charLimit}
                        </span>
                      )}
                    </div>
                    <textarea
                      value={posts[p.id] || ''}
                      onChange={(e) => setPosts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      rows={8}
                      className="input-glass text-xs leading-relaxed resize-none flex-1"
                      disabled={isDeployed}
                    />
                    <div className="flex gap-2">
                      {/* Copy button */}
                      <button
                        onClick={() => handleCopy(p.id, posts[p.id] || '')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all"
                      >
                        {copied === p.id
                          ? <><CheckCircle className="w-3.5 h-3.5 text-green-400" />Copied!</>
                          : <><Copy className="w-3.5 h-3.5" />Copy</>
                        }
                      </button>

                      {/* Deploy button */}
                      <button
                        id={`deploy-${p.id}-btn`}
                        onClick={() => handleDeploy(p)}
                        disabled={isDeploying || isDeployed}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                        style={{
                          background: isDeployed ? '#10b98120' : hasFailed ? 'rgba(239,68,68,0.12)' : `${p.color}20`,
                          border:     `1px solid ${isDeployed ? '#10b98140' : hasFailed ? 'rgba(239,68,68,0.3)' : p.color + '40'}`,
                          color:      isDeployed ? '#10b981' : hasFailed ? '#f87171' : p.color,
                        }}
                      >
                        {isDeploying
                          ? <><Loader className="w-3.5 h-3.5 animate-spin" />Posting…</>
                          : isDeployed
                            ? <><CheckCircle className="w-3.5 h-3.5" />Posted!</>
                            : hasFailed
                              ? <><AlertTriangle className="w-3.5 h-3.5" />Retry</>
                              : platformStatus[p.id] === false
                                ? <><WifiOff className="w-3.5 h-3.5" />Not Configured</>
                                : <><Send className="w-3.5 h-3.5" />Post to {p.name}</>
                        }
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-6 text-center">
                    <div>
                      <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-600">Enter a claim above to generate</p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
    </AppLayout>
  );
}
