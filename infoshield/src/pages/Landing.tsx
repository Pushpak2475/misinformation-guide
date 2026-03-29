import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ParticlesBackground from '../components/ui/ParticlesBackground';
import {
  Shield, Zap, Brain, Globe, Search, BarChart2,
  ArrowRight, CheckCircle, Database, ChevronDown,
  Activity, AlertTriangle, Lock, Cpu
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Multi-Agent AI System',
    desc: 'Four specialized agents work in concert: Data Collector, Verification, Source Credibility, and Decision Agent.',
    color: '#7c3aed',
    gradient: 'from-purple-500/20 to-purple-900/5',
  },
  {
    icon: Zap,
    title: 'Real-Time Detection',
    desc: 'Scans millions of posts across Twitter/X, Reddit, and RSS feeds every second with sub-3s response time.',
    color: '#00d4ff',
    gradient: 'from-cyan-500/20 to-cyan-900/5',
  },
  {
    icon: Globe,
    title: 'Provenance Tracking',
    desc: 'Traces the origin of every claim with metadata analysis, source history, and information lineage mapping.',
    color: '#10b981',
    gradient: 'from-emerald-500/20 to-emerald-900/5',
  },
  {
    icon: BarChart2,
    title: 'Advanced Analytics',
    desc: 'Live dashboards with trend analysis, confidence scoring, and cross-source comparison tools.',
    color: '#ec4899',
    gradient: 'from-pink-500/20 to-pink-900/5',
  },
  {
    icon: Lock,
    title: 'Source Credibility Scoring',
    desc: 'Dynamic credibility scores for 1,200+ news outlets updated in real-time based on accuracy history.',
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-amber-900/5',
  },
  {
    icon: Cpu,
    title: 'Counter-Messaging AI',
    desc: 'Automatically generates factual rebuttals, explanations, and corrective content for verified misinformation.',
    color: '#ef4444',
    gradient: 'from-red-500/20 to-red-900/5',
  },
];

const stats = [
  { value: '98.7%', label: 'Detection Accuracy' },
  { value: '1.2M+', label: 'Articles Daily' },
  { value: '<2.4s', label: 'Response Time' },
  { value: '50+',   label: 'Active Agents' },
];

const techStack = ['React 18', 'FastAPI', 'GPT-4o', 'LangChain', 'PostgreSQL', 'Redis', 'Kafka', 'Docker'];

const agentSteps = [
  { icon: Database,    title: 'Data Collection',    desc: 'Scrape social media, RSS feeds, news APIs', color: '#00d4ff' },
  { icon: CheckCircle, title: 'Fact Verification',  desc: 'Cross-reference against trusted databases',  color: '#7c3aed' },
  { icon: AlertTriangle, title: 'Credibility Scoring', desc: 'Score sources and propagation patterns',  color: '#f59e0b' },
  { icon: Brain,       title: 'AI Decision',         desc: 'Verdict: REAL / FAKE / UNCERTAIN',          color: '#ec4899' },
  { icon: Activity,    title: 'Counter-Messaging',   desc: 'Generate rebuttal and alert systems',       color: '#10b981' },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' as const },
  transition: { duration: 0.7, delay, ease: 'easeOut' as const },
});

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-dark overflow-x-hidden">
      <ParticlesBackground />

      {/* Cyber grid overlay */}
      <div className="fixed inset-0 cyber-grid opacity-40 pointer-events-none z-0" />

      {/* Glow orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-1/3 right-1/4 w-80 h-80 bg-accent-purple/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* ── NAV ── */}
      <nav className="relative z-30 flex items-center justify-between px-6 md:px-12 py-5 glass-dark border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center animate-pulse-glow">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-white text-lg">InfoShield AI</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#tech" className="hover:text-white transition-colors">Tech Stack</a>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/check-news')} className="btn-ghost text-sm py-2">
            Try Demo
          </button>
          <button onClick={() => navigate('/login')} className="btn-ghost text-sm py-2">
            Sign In
          </button>
          <button onClick={() => navigate('/signup')} className="btn-primary text-sm py-2">
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-32">
        {/* Badge */}
        <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-sm text-primary mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Next-Generation AI Misinformation Defense</span>
          <ArrowRight className="w-4 h-4" />
        </motion.div>

        {/* Title */}
        <motion.h1 {...fadeUp(0.1)} className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-none mb-6 max-w-5xl">
          <span className="text-white">AI-Powered</span>
          <br />
          <span className="gradient-text">Misinformation</span>
          <br />
          <span className="text-white">Defense System</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p {...fadeUp(0.2)} className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          A multi-agent AI system that detects, verifies, and counters misinformation across social media and news platforms in real time — with 98.7% accuracy.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <button
            onClick={() => navigate('/signup')}
            className="btn-primary text-base px-8 py-4 gap-3"
          >
            <Shield className="w-5 h-5" />
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn-ghost text-base px-8 py-4"
          >
            <ArrowRight className="w-5 h-5" />
            Sign In
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div {...fadeUp(0.4)} className="flex flex-wrap justify-center gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold gradient-text-cyan">{stat.value}</div>
              <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          {...fadeUp(0.6)}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs">Scroll to explore</span>
          <ChevronDown className="w-4 h-4" />
        </motion.div>

        {/* Hero floating mockup */}
        <motion.div
          {...fadeUp(0.5)}
          className="relative w-full max-w-4xl mt-16 rounded-2xl overflow-hidden"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-glass-lg">
            {/* Fake window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-dark-100">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-5 rounded-md bg-white/5 flex items-center px-3">
                  <span className="text-xs text-slate-500">infoshield.ai/dashboard</span>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>

            {/* Dashboard preview */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-dark-100">
              {/* Stat cards */}
              {[
                { label: 'Scanned Today', val: '1.2M', color: '#00d4ff' },
                { label: 'Fake Detected', val: '3,841', color: '#ef4444' },
                { label: 'Accuracy',      val: '98.7%', color: '#10b981' },
              ].map((s) => (
                <div key={s.label} className="glass rounded-xl p-3">
                  <div className="text-xs text-slate-500">{s.label}</div>
                  <div className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.val}</div>
                  <div className="h-1 rounded-full mt-2 bg-white/5">
                    <div className="h-full rounded-full w-3/4" style={{ background: s.color, opacity: 0.5 }} />
                  </div>
                </div>
              ))}

              {/* Chart placeholder */}
              <div className="col-span-3 glass rounded-xl p-3 flex items-end gap-1 h-24">
                {[40,65,45,80,55,90,70,85,60,78,92,67].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ height: `${h}%`, background: `rgba(0,212,255,${0.3 + (h/100)*0.5})` }}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* Glow under the card */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-primary/20 blur-xl rounded-full" />
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 py-24 px-6 md:px-12">
        <motion.div {...fadeUp()} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-purple/30 bg-accent-purple/5 text-xs text-accent-purple mb-4">
            <Zap className="w-3 h-3" /> Core Capabilities
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Everything You Need to
            <span className="gradient-text"> Fight Misinformation</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            A complete toolbox of AI-powered agents working together to make the information ecosystem safer.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <motion.div key={f.title} {...fadeUp(i * 0.08)}>
              <div
                className={`glass-card h-full bg-gradient-to-br ${f.gradient} hover:border-opacity-50 transition-all duration-300`}
                style={{ borderColor: `${f.color}20` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}20`, border: `1px solid ${f.color}30` }}
                >
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary mb-4">
              <Activity className="w-3 h-3" /> Agent Pipeline
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              How the <span className="gradient-text">AI Agents</span> Work
            </h2>
          </motion.div>

          <div className="flex flex-col gap-4">
            {agentSteps.map((step, i) => (
              <motion.div key={step.title} {...fadeUp(i * 0.1)}>
                <div className="glass-card flex items-center gap-6 hover:scale-[1.01]">
                  {/* Step number */}
                  <div
                    className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl font-bold"
                    style={{ background: `${step.color}15`, border: `1px solid ${step.color}30`, color: step.color }}
                  >
                    {i + 1}
                  </div>

                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: `${step.color}15` }}
                  >
                    <step.icon className="w-5 h-5" style={{ color: step.color }} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{step.title}</div>
                    <div className="text-sm text-slate-400 mt-0.5">{step.desc}</div>
                  </div>

                  {/* Connector */}
                  {i < agentSteps.length - 1 && (
                    <div className="hidden absolute -bottom-2 left-16 w-px h-4 bg-gradient-to-b from-slate-600/50 to-transparent" />
                  )}

                  {/* Status */}
                  <div
                    className="flex-shrink-0 text-xs font-medium px-3 py-1 rounded-full"
                    style={{ background: `${step.color}15`, color: step.color, border: `1px solid ${step.color}25` }}
                  >
                    Active
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section id="tech" className="relative z-10 py-24 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp()}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-pink/30 bg-accent-pink/5 text-xs text-accent-pink mb-4">
              <Cpu className="w-3 h-3" /> Tech Stack
            </div>
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Built With <span className="gradient-text">Best-in-Class</span> Tools
            </h2>
            <p className="text-slate-400 mb-12">Enterprise-ready infrastructure powering the most accurate misinformation detection pipeline.</p>

            <div className="flex flex-wrap justify-center gap-3">
              {techStack.map((tech, i) => (
                <motion.div
                  key={tech}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ scale: 1.08, y: -2 }}
                  className="px-5 py-2.5 glass rounded-xl text-sm font-medium text-slate-300 border border-white/8 hover:border-primary/30 hover:text-white transition-all duration-200 cursor-default"
                >
                  {tech}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative z-10 py-24 px-6 text-center">
        <motion.div {...fadeUp()}>
          <div className="max-w-3xl mx-auto glass rounded-3xl p-12 border border-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-glow-radial opacity-30" />
            <h2 className="relative text-4xl font-display font-bold text-white mb-4">
              Ready to Fight <span className="glow-text gradient-text">Misinformation</span>?
            </h2>
            <p className="relative text-slate-400 mb-8 max-w-xl mx-auto">
              Access the full dashboard to monitor, analyze, and counter misinformation in real time.
            </p>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate('/signup')} className="btn-primary text-base px-8 py-4">
                <ArrowRight className="w-5 h-5" />
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={() => navigate('/check-news')} className="btn-ghost text-base px-8 py-4">
                <Search className="w-5 h-5" />
                Try Demo
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-white">InfoShield AI</span>
        </div>
        <p className="text-xs text-slate-600">© 2026 InfoShield AI — Agentic Misinformation Containment System</p>
      </footer>
    </div>
  );
}


