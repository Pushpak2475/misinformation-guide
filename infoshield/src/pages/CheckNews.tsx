import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Link2, Loader, CheckCircle, XCircle, AlertTriangle,
  Copy, ExternalLink, Shield, Zap, Clock, BarChart2,
  TrendingUp, Globe, AlertCircle, Info,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import GlassCard from '../components/ui/GlassCard';
import RadialChart from '../components/charts/RadialChart';
import { classifyText, type ClassificationResult } from '../services/classifierService';

const TABS = ['Summary', 'Signals', 'Claim Analysis', 'Counter Message', 'Verify'] as const;
type Tab = typeof TABS[number];

const VERDICT_CFG = {
  fake: {
    label: 'FAKE / MISINFORMATION',
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
    icon: XCircle,
    badge: 'badge-fake',
    emoji: '🔴',
    description: 'Strong indicators of misinformation detected. This content likely contains false or misleading claims.',
  },
  real: {
    label: 'VERIFIED / CREDIBLE',
    color: '#10b981',
    bgColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.25)',
    icon: CheckCircle,
    badge: 'badge-real',
    emoji: '✅',
    description: 'Content appears to be credible and consistent with professional journalism standards.',
  },
  uncertain: {
    label: 'NEEDS VERIFICATION',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.25)',
    icon: AlertTriangle,
    badge: 'badge-uncertain',
    emoji: '⚠️',
    description: 'Insufficient signals — this content could not be conclusively verified or debunked. Manual fact-checking recommended.',
  },
};

const AGENT_STEPS = [
  { label: 'Input Parser',           desc: 'Extracting text, URLs, and metadata from input' },
  { label: 'Domain Credibility',     desc: 'Scoring origin domain against 80+ site database' },
  { label: 'Keyword Scanner',        desc: 'Checking 200+ misinformation pattern indicators' },
  { label: 'Language Analyzer',      desc: 'Detecting sensationalism, emotional manipulation' },
  { label: 'Signal Aggregator',      desc: 'Weighting all signals and computing final verdict' },
];

/** Fact-check search URLs for a query */
function getFactCheckLinks(query: string) {
  const q = encodeURIComponent(query.slice(0, 80).trim());
  return [
    { name: 'Snopes',          url: `https://www.snopes.com/search/?q=${q}`,                  icon: '🔍', color: '#f59e0b' },
    { name: 'PolitiFact',      url: `https://www.politifact.com/search/?q=${q}`,              icon: '🏛', color: '#3b82f6' },
    { name: 'FactCheck.org',   url: `https://www.factcheck.org/?s=${q}`,                      icon: '✅', color: '#10b981' },
    { name: 'Reuters Fact Check', url: `https://www.reuters.com/fact-check/`,                 icon: '📰', color: '#ef4444' },
    { name: 'AFP Fact Check',  url: `https://factcheck.afp.com/search/${q}`,                  icon: '🗞', color: '#6366f1' },
    { name: 'Full Fact',       url: `https://fullfact.org/search/?q=${q}`,                    icon: '🇬🇧', color: '#14b8a6' },
    { name: 'Lead Stories',    url: `https://leadstories.com/?s=${q}`,                        icon: '📋', color: '#8b5cf6' },
    { name: 'MediaBias Check', url: `https://mediabiasfactcheck.com/?s=${q}`,                 icon: '⚖️', color: '#64748b' },
    { name: 'Google News',     url: `https://news.google.com/search?q=${q}`,                  icon: '🌐', color: '#4285f4' },
    { name: 'DuckDuckGo',      url: `https://duckduckgo.com/?q=${q}+fact+check`,              icon: '🦆', color: '#de5833' },
  ];
}

const EXAMPLE_HEADLINES = [
  { text: '5G towers are secretly spreading COVID-19 virus according to doctors', type: 'fake' },
  { text: 'Scientists discover new treatment for diabetes, study published in Nature', type: 'real' },
  { text: 'Government hiding cure for cancer revealed in leaked document', type: 'fake' },
  { text: 'Reuters: Federal Reserve raises interest rates by 0.25%, officials confirm', type: 'real' },
  { text: 'SHOCKING: Bill Gates microchip in vaccines exposed by whistleblower', type: 'fake' },
];

export default function CheckNews() {
  const [input, setInput]           = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult]         = useState<ClassificationResult | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>('Summary');
  const [scanLine, setScanLine]     = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputMode, setInputMode]   = useState<'text' | 'url'>('text');
  const [copied, setCopied]         = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    setScanLine(true);
    setResult(null);
    setCurrentStep(0);
    setActiveTab('Summary');

    // Animate through agent steps while running
    let step = 0;
    const stepInterval = setInterval(() => {
      step = Math.min(step + 1, AGENT_STEPS.length - 1);
      setCurrentStep(step);
    }, 450);

    await new Promise((r) => setTimeout(r, 250));

    // Extract domain hint if URL in text
    let domainHint: string | undefined;
    const urlMatch = input.match(/https?:\/\/(www\.)?([^\s/]+)/);
    if (urlMatch) domainHint = urlMatch[2];

    const res = await classifyText(input, domainHint);

    clearInterval(stepInterval);
    setCurrentStep(AGENT_STEPS.length - 1);
    await new Promise((r) => setTimeout(r, 500));

    setIsAnalyzing(false);
    setScanLine(false);
    setResult(res);
    setCurrentStep(0);
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.counterMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cfg = result ? VERDICT_CFG[result.verdict] : null;
  const factCheckLinks = result ? getFactCheckLinks(input.slice(0, 100)) : [];

  return (
    <AppLayout title="Check News" subtitle="Paste any headline, article, or URL — AI classifies it instantly">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* ── Input Card ── */}
            <GlassCard className="!p-0 overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-white">Analyze Content</h2>
                  <span className="text-xs text-slate-500 ml-auto">Ctrl+Enter to analyze</span>
                </div>

                {/* Mode toggle */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { mode: 'text' as const, Icon: Search, label: 'Paste Text' },
                    { mode: 'url'  as const, Icon: Link2,  label: 'Enter URL' },
                  ].map(({ mode, Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setInputMode(mode)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        inputMode === mode
                          ? 'text-primary bg-primary/10 border border-primary/20'
                          : 'text-slate-400 border border-white/8 hover:border-primary/20 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Input area */}
                <div className="relative">
                  {inputMode === 'text' ? (
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && handleAnalyze()}
                      placeholder={"Paste news article text, headline, or claim here...\n\nTry: '5G towers cause COVID according to leaked docs'\nTry: 'Scientists publish peer-reviewed study on climate change in Nature'\nTry: 'https://example.com/news-article'"}
                      className="input-glass w-full h-40 py-4 resize-none text-sm leading-relaxed"
                    />
                  ) : (
                    <input
                      type="url"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                      placeholder="https://example.com/news-article-url"
                      className="input-glass w-full py-4 text-sm"
                    />
                  )}
                  {scanLine && (
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                      <div className="absolute left-0 right-0 h-0.5 bg-primary/70 shadow-glow animate-scan" />
                    </div>
                  )}
                </div>

                {/* Example headlines */}
                {!input && !result && (
                  <div className="mt-3">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Try an example:</p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_HEADLINES.map((ex) => (
                        <button
                          key={ex.text}
                          onClick={() => setInput(ex.text)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all truncate max-w-xs ${
                            ex.type === 'fake'
                              ? 'border-red-500/25 text-red-400/70 hover:text-red-400 hover:bg-red-500/8'
                              : 'border-green-500/25 text-green-400/70 hover:text-green-400 hover:bg-green-500/8'
                          }`}
                        >
                          {ex.type === 'fake' ? '⚠' : '✓'} {ex.text.slice(0, 50)}…
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-slate-600">{input.length} characters</span>
                  <div className="flex gap-3">
                    <button onClick={() => { setInput(''); setResult(null); }} className="btn-ghost py-2 px-4 text-sm">
                      Clear
                    </button>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !input.trim()}
                      className="btn-primary py-2 px-6 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isAnalyzing
                        ? <><Loader className="w-4 h-4 animate-spin" /> Analyzing...</>
                        : <><Zap className="w-4 h-4" /> Analyze with AI</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Agent steps animation */}
              {isAnalyzing && (
                <div className="p-5 space-y-2.5 bg-white/1 border-t border-white/4">
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                    <Loader className="w-3.5 h-3.5 animate-spin text-primary" />
                    Running multi-signal AI analysis pipeline...
                  </p>
                  {AGENT_STEPS.map((step, i) => (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      {i < currentStep ? (
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : i === currentStep ? (
                        <Loader className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-700 flex-shrink-0" />
                      )}
                      <span className={`text-xs font-medium transition-colors ${
                        i < currentStep ? 'text-green-400' :
                        i === currentStep ? 'text-white' : 'text-slate-600'
                      }`}>{step.label}</span>
                      <span className="text-xs text-slate-600 hidden sm:block">— {step.desc}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* ── Results ── */}
            <AnimatePresence>
              {result && cfg && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="space-y-5"
                >
                  {/* Verdict banner */}
                  <div
                    className="rounded-2xl border p-5"
                    style={{ background: cfg.bgColor, borderColor: cfg.borderColor }}
                  >
                    <div className="flex flex-col items-center gap-6">
                      {/* Top row: Radial + Verdict info */}
                      <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                        {/* Radial confidence */}
                        <div className="flex-shrink-0">
                          <RadialChart
                            value={result.confidence}
                            size={148}
                            color={cfg.color}
                            label={result.verdict === 'fake' ? 'FAKE' : result.verdict === 'real' ? 'REAL' : 'UNCLEAR'}
                            sublabel={`${result.confidence}% confidence`}
                          />
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                          {/* Verdict label */}
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className={cfg.badge}>{cfg.emoji} {cfg.label}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {result.processingTimeMs}ms
                            </span>
                          </div>

                          {/* Verdict description */}
                          <p className="text-sm text-slate-300 leading-relaxed mb-4">{cfg.description}</p>

                          {/* Explanation */}
                          <div className="p-3 rounded-xl bg-white/4 border border-white/8 mb-4">
                            <p className="text-xs text-slate-400 leading-relaxed">{result.explanation}</p>
                          </div>

                          {/* Signal chips */}
                          <div className="flex flex-wrap gap-2">
                            {result.signals.map((sig) => (
                              <div
                                key={sig.label}
                                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
                                style={{
                                  background: sig.type === 'positive' ? 'rgba(16,185,129,0.1)' :
                                              sig.type === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                                  borderColor: sig.type === 'positive' ? 'rgba(16,185,129,0.3)' :
                                               sig.type === 'negative' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                                  color: sig.type === 'positive' ? '#34d399' :
                                         sig.type === 'negative' ? '#f87171' : '#94a3b8',
                                }}
                              >
                                <span>{sig.type === 'positive' ? '✓' : sig.type === 'negative' ? '✗' : '·'}</span>
                                <span className="font-medium">{sig.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Reference sources — full width row below on mobile */}
                      <div className="w-full border-t border-white/5 pt-4">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Verify via</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {result.sources.slice(0, 5).map((src) => (
                            <a
                              key={src.name}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs hover:text-white transition-colors group py-0.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: src.color }} />
                              <span className="text-slate-400 group-hover:text-white transition-colors">{src.name}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-700 group-hover:text-primary" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div>
                    <div className="flex gap-1 mb-5 border-b border-white/5 pb-4 overflow-x-auto no-scrollbar">
                      {TABS.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                            activeTab === tab
                              ? 'text-primary bg-primary/10 border border-primary/20'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {tab}
                          {tab === 'Verify' && <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 rounded-full">{factCheckLinks.length}</span>}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* ── Summary tab ── */}
                        {activeTab === 'Summary' && (
                          <GlassCard hover={false}>
                            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                              <BarChart2 className="w-4 h-4 text-primary" /> Analysis Summary
                            </h4>

                            <div className="grid grid-cols-3 gap-4 mb-5">
                              {[
                                { label: 'Verdict',     value: result.verdict.toUpperCase(), color: cfg.color },
                                { label: 'Confidence',  value: `${result.confidence}%`,       color: cfg.color },
                                { label: 'Processed In', value: `${result.processingTimeMs}ms`, color: '#64748b' },
                              ].map((stat) => (
                                <div key={stat.label} className="p-3 rounded-xl bg-white/3 border border-white/6 text-center">
                                  <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                                </div>
                              ))}
                            </div>

                            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">All Detection Signals</h5>
                            <div className="space-y-2 mb-5">
                              {result.signals.map((sig) => (
                                <div key={sig.label} className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-white/2">
                                  <span className="flex-shrink-0 mt-0.5 font-bold" style={{
                                    color: sig.type === 'positive' ? '#34d399' : sig.type === 'negative' ? '#f87171' : '#64748b',
                                  }}>
                                    {sig.type === 'positive' ? '✓' : sig.type === 'negative' ? '✗' : '●'}
                                  </span>
                                  <span className="font-medium text-slate-300 w-32 sm:w-40 flex-shrink-0">{sig.label}</span>
                                  <span className="text-slate-500 flex-1 min-w-0 break-words">{sig.value}</span>
                                </div>
                              ))}
                            </div>

                            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Reference Sources</h5>
                            <div className="grid grid-cols-2 gap-2">
                              {result.sources.map((src) => (
                                <a
                                  key={src.name}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2.5 rounded-xl border border-white/5 hover:border-primary/25 hover:bg-white/3 transition-all group"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: src.color }} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-slate-300 group-hover:text-white transition-colors truncate">{src.name}</div>
                                    {src.badge && <div className="text-[10px] text-slate-600">{src.badge}</div>}
                                  </div>
                                  <ExternalLink className="w-3 h-3 text-slate-700 flex-shrink-0" />
                                </a>
                              ))}
                            </div>
                          </GlassCard>
                        )}

                        {/* ── Signals tab ── */}
                        {activeTab === 'Signals' && (
                          <GlassCard hover={false}>
                            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-primary" /> Signal Breakdown
                            </h4>
                            <div className="space-y-3">
                              {result.signals.map((sig, i) => {
                                const isPos = sig.type === 'positive';
                                const isNeg = sig.type === 'negative';
                                return (
                                  <motion.div
                                    key={sig.label}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.07 }}
                                    className={`p-4 rounded-xl border ${
                                      isPos ? 'bg-green-500/6 border-green-500/20' :
                                      isNeg ? 'bg-red-500/6 border-red-500/20' :
                                              'bg-white/3 border-white/8'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold text-sm" style={{
                                        color: isPos ? '#34d399' : isNeg ? '#f87171' : '#94a3b8',
                                      }}>
                                        {isPos ? '✓' : isNeg ? '✗' : '●'}
                                      </span>
                                      <span className="font-semibold text-sm text-white">{sig.label}</span>
                                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isPos ? 'bg-green-500/15 text-green-400' :
                                        isNeg ? 'bg-red-500/15 text-red-400' :
                                                'bg-white/8 text-slate-400'
                                      }`}>
                                        {isPos ? 'SUPPORTS REAL' : isNeg ? 'SUPPORTS FAKE' : 'NEUTRAL'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 ml-5">{sig.value}</p>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </GlassCard>
                        )}

                        {/* ── Claim Analysis tab ── */}
                        {activeTab === 'Claim Analysis' && (
                          <GlassCard hover={false}>
                            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-primary" /> Claim-by-Claim Breakdown
                            </h4>
                            {result.claims.length === 0 ? (
                              <p className="text-slate-500 text-sm">No distinct claims extracted — input may be too short.</p>
                            ) : (
                              <div className="space-y-4">
                                {result.claims.map((claim, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-4 rounded-xl border border-white/6 bg-white/2"
                                  >
                                    <div className="flex items-start gap-3 mb-3 flex-wrap">
                                      <span className={
                                        claim.status === 'debunked' ? 'badge-fake' :
                                        claim.status === 'verified' ? 'badge-real' : 'badge-uncertain'
                                      }>
                                        {claim.status === 'debunked' ? '✗ DEBUNKED' :
                                         claim.status === 'verified' ? '✓ VERIFIED' : '? UNCLEAR'}
                                      </span>
                                    </div>
                                    <p className="text-sm font-medium text-white mb-2 leading-relaxed">"{claim.claim}"</p>
                                    <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2 mt-2">{claim.detail}</p>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </GlassCard>
                        )}

                        {/* ── Counter Message tab ── */}
                        {activeTab === 'Counter Message' && (
                          <GlassCard hover={false}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-white flex items-center gap-2">
                                <Info className="w-4 h-4 text-primary" /> AI-Generated Rebuttal
                              </h4>
                              <button onClick={handleCopy} className="btn-ghost py-1.5 px-3 text-xs">
                                <Copy className="w-3.5 h-3.5" />
                                {copied ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <div className="p-4 rounded-xl bg-dark/60 border border-white/8 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                              {result.counterMessage}
                            </div>
                          </GlassCard>
                        )}

                        {/* ── Verify tab ── */}
                        {activeTab === 'Verify' && (
                          <GlassCard hover={false}>
                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                              <Globe className="w-4 h-4 text-primary" /> Independent Verification Links
                            </h4>
                            <p className="text-xs text-slate-500 mb-5">
                              The AI verdict is based on pattern analysis. Always verify with these independent fact-checking resources before sharing.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {factCheckLinks.map((link) => (
                                <a
                                  key={link.name}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3.5 rounded-xl border border-white/6 hover:border-primary/25 hover:bg-white/3 transition-all group"
                                >
                                  <span className="text-xl">{link.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{link.name}</div>
                                    <div className="text-xs text-slate-600 truncate mt-0.5">Search: "{input.slice(0, 40)}…"</div>
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-slate-700 group-hover:text-primary transition-colors flex-shrink-0" />
                                </a>
                              ))}
                            </div>

                            <div className="mt-5 p-4 rounded-xl bg-primary/5 border border-primary/15">
                              <p className="text-xs text-slate-400 leading-relaxed">
                                <span className="font-semibold text-primary">Pro tip:</span> If multiple reputable fact-checkers (Snopes, PolitiFact, Reuters) have not covered a story, it may be either too recent or too obscure. Use Google News to search for coverage by mainstream outlets.
                              </p>
                            </div>
                          </GlassCard>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
    </AppLayout>
  );
}
