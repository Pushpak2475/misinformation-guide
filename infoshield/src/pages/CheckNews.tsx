import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Link2, Loader, CheckCircle, XCircle, AlertTriangle,
  Copy, ExternalLink, Shield, Zap, Clock, BarChart2,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import RadialChart from '../components/charts/RadialChart';
import { classifyText, type ClassificationResult } from '../services/classifierService';

const TABS = ['Summary', 'Detailed Analysis', 'Counter Message'] as const;
type Tab = (typeof TABS)[number];

const verdictConfig = {
  fake:     { label: 'FAKE',      color: '#ef4444', icon: XCircle,        badge: 'badge-fake' },
  real:     { label: 'REAL',      color: '#10b981', icon: CheckCircle,     badge: 'badge-real' },
  uncertain:{ label: 'UNCERTAIN', color: '#f59e0b', icon: AlertTriangle,   badge: 'badge-uncertain' },
};

const AGENT_STEPS = [
  { label: 'Data Collection Agent',  desc: 'Extracting text, URLs, and metadata' },
  { label: 'Source Credibility',     desc: 'Scoring origin domain (100+ sources in DB)' },
  { label: 'Keyword Analysis',       desc: 'Checking 200+ misinformation indicators' },
  { label: 'Sensationalism Detector',desc: 'Identifying clickbait and emotional language' },
  { label: 'Decision Agent',         desc: 'Computing final FAKE / REAL / UNCERTAIN verdict' },
];

export default function CheckNews() {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Summary');
  const [scanLine, setScanLine] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text');

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    setScanLine(true);
    setResult(null);
    setCurrentStep(0);

    // Simulate progressive agent steps while classifier runs
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= AGENT_STEPS.length - 1) { clearInterval(stepInterval); return prev; }
        return prev + 1;
      });
    }, 400);

    // Small artificial delay so the UI animation is visible (classifier is instant)
    await new Promise((r) => setTimeout(r, 300));

    const res = await classifyText(input);

    clearInterval(stepInterval);
    setCurrentStep(AGENT_STEPS.length - 1);

    await new Promise((r) => setTimeout(r, 600)); // let last step show

    setIsAnalyzing(false);
    setScanLine(false);
    setResult(res);
    setActiveTab('Summary');
    setCurrentStep(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAnalyze();
  };

  return (
    <div className="flex h-screen bg-dark overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Navbar title="Check News" subtitle="Paste text, URL, or headline — AI classifies it in real time" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Input Card */}
            <GlassCard className="!p-0 overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-white">Analyze Content</h2>
                  <span className="text-xs text-slate-500 ml-auto">Ctrl+Enter to analyze</span>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-2 mb-4">
                  {[
                    { mode: 'text' as const, Icon: Search, label: 'Paste Text / Headline' },
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
                      onKeyDown={handleKeyDown}
                      placeholder={"Paste news article text or headline here...\n\nExample: '5G towers cause COVID-19 according to leaked documents...'\nExample: 'Scientists discover new exoplanet in habitable zone according to Nature study'"}
                      className="input-glass w-full h-44 py-4 resize-none text-sm leading-relaxed"
                    />
                  ) : (
                    <input
                      type="url"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                      placeholder="https://example.com/article-url"
                      className="input-glass w-full py-4 text-sm"
                    />
                  )}

                  {/* Scan animation */}
                  {scanLine && (
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                      <div className="absolute left-0 right-0 h-0.5 bg-primary/70 shadow-glow animate-scan" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-slate-600">{input.length} chars</span>
                  <div className="flex gap-3">
                    <button onClick={() => { setInput(''); setResult(null); }} className="btn-ghost py-2 px-4 text-sm">
                      Clear
                    </button>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !input.trim()}
                      className="btn-primary py-2 px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? (
                        <><Loader className="w-4 h-4 animate-spin" />Analyzing...</>
                      ) : (
                        <><Zap className="w-4 h-4" />Analyze with AI</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Agent processing steps */}
              {isAnalyzing && (
                <div className="p-5 space-y-2.5 border-t border-white/4 bg-dark-100/40">
                  {AGENT_STEPS.map((step, i) => (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="flex items-center gap-3"
                    >
                      {i < currentStep ? (
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : i === currentStep ? (
                        <Loader className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-700 flex-shrink-0" />
                      )}
                      <span className={`text-xs font-medium ${
                        i < currentStep ? 'text-green-400' :
                        i === currentStep ? 'text-white' : 'text-slate-600'
                      }`}>{step.label}</span>
                      <span className="text-xs text-slate-600">— {step.desc}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* ── Results ── */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  {/* Verdict Card */}
                  <GlassCard className="!p-5" hover={false}>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-shrink-0">
                        <RadialChart
                          value={result.confidence}
                          size={140}
                          color={verdictConfig[result.verdict].color}
                          label={verdictConfig[result.verdict].label}
                          sublabel="Confidence"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={verdictConfig[result.verdict].badge}>
                            {verdictConfig[result.verdict].label}
                          </span>
                          <span className="text-xs text-slate-500">AI Verdict</span>
                          <span className="text-xs text-slate-600 ml-auto flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {result.processingTimeMs}ms
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          This content is likely{' '}
                          <span style={{ color: verdictConfig[result.verdict].color }}>
                            {result.verdict.toUpperCase()}
                          </span>
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{result.explanation}</p>

                        {/* Signals */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {result.signals.map((sig) => (
                            <div
                              key={sig.label}
                              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                              style={{
                                background: sig.type === 'positive' ? 'rgba(16,185,129,0.1)' :
                                            sig.type === 'negative' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${sig.type === 'positive' ? 'rgba(16,185,129,0.25)' :
                                                      sig.type === 'negative' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)'}`,
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

                      {/* Cross-reference Sources */}
                      <div className="flex-shrink-0">
                        <div className="text-xs text-slate-500 mb-2">Cross-referenced</div>
                        <div className="space-y-1.5">
                          {result.sources.map((src) => (
                            <a key={src.name} href={src.url} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-2 text-xs hover:text-white transition-colors group">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: src.color }} />
                              <span className="text-slate-400 group-hover:text-white">{src.name}</span>
                              <span className="font-medium ml-auto" style={{ color: src.color }}>{src.credibility}%</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-700" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Analysis Tabs */}
                  <div>
                    <div className="flex gap-2 mb-4 border-b border-white/5 pb-4">
                      {TABS.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                            activeTab === tab
                              ? 'text-primary bg-primary/10 border border-primary/20'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                      >
                        {activeTab === 'Summary' && (
                          <GlassCard hover={false}>
                            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                              <BarChart2 className="w-4 h-4 text-primary" />
                              Analysis Summary
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed mb-4">{result.explanation}</p>

                            {/* Signal breakdown */}
                            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detection Signals</h5>
                            <div className="space-y-2 mb-4">
                              {result.signals.map((sig) => (
                                <div key={sig.label} className="flex items-start gap-2 text-xs">
                                  <span className="mt-0.5 flex-shrink-0" style={{
                                    color: sig.type === 'positive' ? '#34d399' : sig.type === 'negative' ? '#f87171' : '#64748b',
                                  }}>
                                    {sig.type === 'positive' ? '✓' : sig.type === 'negative' ? '✗' : '●'}
                                  </span>
                                  <span className="font-medium text-slate-300 flex-shrink-0 w-36">{sig.label}</span>
                                  <span className="text-slate-500">{sig.value}</span>
                                </div>
                              ))}
                            </div>

                            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reference Sources</h5>
                            <div className="grid grid-cols-2 gap-2">
                              {result.sources.map((src) => (
                                <a key={src.name} href={src.url} target="_blank" rel="noopener noreferrer"
                                   className="flex items-center gap-2 p-2.5 rounded-xl border border-white/5 hover:border-primary/20 transition-colors group">
                                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: src.color }} />
                                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{src.name}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-600 ml-auto" />
                                </a>
                              ))}
                            </div>
                          </GlassCard>
                        )}

                        {activeTab === 'Detailed Analysis' && (
                          <GlassCard hover={false}>
                            <h4 className="font-semibold text-white mb-4">Claim-by-Claim Analysis</h4>
                            <div className="space-y-4">
                              {result.claims.map((claim, i) => (
                                <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/2">
                                  <div className="flex items-start gap-3 mb-2 flex-wrap">
                                    <span className={
                                      claim.status === 'debunked' ? 'badge-fake' :
                                      claim.status === 'verified' ? 'badge-real' : 'badge-uncertain'
                                    }>
                                      {claim.status.toUpperCase()}
                                    </span>
                                    <span className="text-sm font-medium text-white flex-1">{claim.claim}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 leading-relaxed">{claim.detail}</p>
                                </div>
                              ))}
                            </div>
                          </GlassCard>
                        )}

                        {activeTab === 'Counter Message' && (
                          <GlassCard hover={false}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-white">AI-Generated Rebuttal</h4>
                              <button
                                onClick={() => navigator.clipboard.writeText(result.counterMessage)}
                                className="btn-ghost py-1.5 px-3 text-xs"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copy
                              </button>
                            </div>
                            <div className="p-4 rounded-xl bg-dark-100/60 border border-white/5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                              {result.counterMessage}
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
        </main>
      </div>
    </div>
  );
}
