import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Shield, AlertCircle, CheckCircle, Clock,
  XCircle, BarChart2, Users, Activity, ChevronDown, ChevronUp,
  RefreshCw, Trash2, Settings, LogIn,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import { flaggedItems, agentLogs, trendData } from '../data/mockData';
import { getSession } from '../services/authService';

export default function Admin() {
  const navigate = useNavigate();
  const session = getSession();
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  /* — NOT SIGNED IN — redirect prompt */
  if (!session?.loggedIn) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-sm px-6 text-center"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center mb-4 animate-pulse-glow">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">InfoShield AI</h1>
            <p className="text-slate-500 text-sm mt-1">Admin Panel</p>
          </div>
          <div className="glass-card text-center">
            <LogIn className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Sign In Required</h2>
            <p className="text-sm text-slate-400 mb-6">You need to be signed in to access the Admin Panel.</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full mb-3"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="btn-ghost w-full"
            >
              Create Account
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
  /* ── ADMIN DASHBOARD ── */
  const adminStats = [
    { label: 'Total Flagged', value: '3,841', icon: AlertCircle, color: '#ef4444' },
    { label: 'Confirmed Fake', value: '2,910', icon: XCircle, color: '#f59e0b' },
    { label: 'Overrides Today', value: '14',   icon: Settings,  color: '#7c3aed' },
    { label: 'Active Users',   value: '287',   icon: Users,     color: '#00d4ff' },
  ];

  const sorted = [...flaggedItems].sort((a, b) =>
    sortDir === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
  );

  return (
    <div className="flex h-screen bg-dark overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Navbar title="Admin Panel" subtitle="System management & oversight" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {adminStats.map((s, i) => (
              <GlassCard key={s.label} delay={i * 0.07} className="!p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                    <div className="text-xl font-bold text-white">{s.value}</div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Flagged Items Table */}
          <GlassCard delay={0.2} className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h3 className="font-semibold text-white">Flagged Misinformation</h3>
              </div>
              <button
                onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
                className="btn-ghost py-1.5 px-3 text-xs"
              >
                Sort {sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th className="text-left">ID</th>
                    <th className="text-left">Title</th>
                    <th className="text-left">Category</th>
                    <th className="text-left">Verdict</th>
                    <th className="text-left">Confidence</th>
                    <th className="text-left">Source</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <code className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded">{item.id}</code>
                      </td>
                      <td className="max-w-xs">
                        <span className="truncate block" title={item.title}>{item.title}</span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-400">{item.category}</span>
                      </td>
                      <td>
                        <span className={`badge-${item.verdict}`}>{item.verdict.toUpperCase()}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${item.confidence}%`,
                                background: item.verdict === 'fake' ? '#ef4444' : '#f59e0b',
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{item.confidence}%</span>
                        </div>
                      </td>
                      <td><span className="text-xs text-slate-400">{item.source}</span></td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          item.status === 'Confirmed'   ? 'bg-green-500/10 text-green-400' :
                          item.status === 'Investigating'? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button title="Override" className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-slate-500 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button title="Delete" className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-slate-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Logs + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Agent Logs Timeline */}
            <GlassCard delay={0.3} className="!p-5">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-white">Agent Logs Timeline</h3>
              </div>
              <div className="relative pl-6 space-y-4">
                {/* Timeline line */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-white/5" />
                {agentLogs.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="relative"
                  >
                    {/* Dot */}
                    <div className={`absolute -left-4 top-1 w-2 h-2 rounded-full border-2 border-dark ${
                      log.status === 'completed' ? 'bg-green-400' :
                      log.status === 'running'   ? 'bg-primary animate-pulse' : 'bg-slate-600'
                    }`} />

                    <div className="glass rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{
                          color: log.status === 'completed' ? '#10b981' :
                                 log.status === 'running'   ? '#00d4ff' : '#64748b'
                        }}>
                          [{log.agent}]
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">{log.time}</span>
                      </div>
                      <p className="text-xs text-slate-400">{log.action}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {log.status === 'completed' ? <CheckCircle className="w-3 h-3 text-green-400" /> :
                         log.status === 'running'   ? <RefreshCw className="w-3 h-3 text-primary animate-spin" /> :
                                                      <Clock className="w-3 h-3 text-slate-600" />}
                        <span className="text-[10px] text-slate-500 capitalize">{log.status} · {log.duration}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Analytics Chart */}
            <GlassCard delay={0.35} className="!p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-accent-purple" />
                <h3 className="font-semibold text-white">Detection Analytics</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(5,11,24,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line type="monotone" dataKey="detected"  name="Detected"       stroke="#00d4ff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="misinfo"   name="Misinformation" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="verified"  name="Verified"       stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        </main>
      </div>
    </div>
  );
}
