import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle, Loader, ShieldCheck } from 'lucide-react';
import { createVerification, isVerified } from './VerifyEmail';

// Simple in-memory auth store (persisted to localStorage)
function getUsers(): Record<string, { email: string; name: string; password: string }> {
  try { return JSON.parse(localStorage.getItem('infoshield_users') || '{}'); }
  catch { return {}; }
}

function saveUser(email: string, name: string, password: string) {
  const users = getUsers();
  users[email] = { email, name, password };
  localStorage.setItem('infoshield_users', JSON.stringify(users));
  localStorage.setItem('infoshield_session', JSON.stringify({ email, name, loggedIn: true, verified: false }));
  // Generate OTP and log to console (in prod, send via email)
  const otp = createVerification(email);
  console.info(`[InfoShield Dev] OTP for ${email}: ${otp}`);
}

export function getSession(): { email: string; name: string; loggedIn: boolean } | null {
  try { return JSON.parse(localStorage.getItem('infoshield_session') || 'null'); }
  catch { return null; }
}

export function logout() {
  localStorage.removeItem('infoshield_session');
}

// ──────────── Shared input component ────────────
function InputField({
  label, type, value, onChange, placeholder, icon: Icon, error, hint,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: React.ElementType; error?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const inputType = type === 'password' ? (show ? 'text' : 'password') : type;
  return (
    <div className="mb-4">
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`input-glass w-full pl-10 pr-10 ${error ? 'border-red-500/40 !ring-red-500/20' : ''}`}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
      {hint && !error && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

// ──────────── LOGIN PAGE ────────────
export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    const users = getUsers();
    const user = users[email.toLowerCase()];

    // Allow demo admin login (pre-verified)
    const isDemoAdmin = email === 'admin@infoshield.ai' && password === 'admin123';

    if (isDemoAdmin) {
      localStorage.setItem('infoshield_session', JSON.stringify({ email, name: 'Admin User', loggedIn: true, verified: true }));
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 900);
    } else if (user && user.password === password) {
      const verified = isVerified(email.toLowerCase());
      localStorage.setItem('infoshield_session', JSON.stringify({ email: user.email, name: user.name, loggedIn: true, verified }));
      if (!verified) {
        // Regenerate OTP and redirect to verify
        const otp = createVerification(email.toLowerCase());
        console.info(`[InfoShield Dev] OTP for ${email}: ${otp}`);
        setLoading(false);
        navigate('/verify-email', { state: { email: email.toLowerCase() } });
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 900);
    } else {
      setError('Invalid email or password. New? Sign up first.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' as const }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center mb-4 shadow-glow">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">InfoShield AI</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="glass-card">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                  <CheckCircle className="w-7 h-7 text-green-400" />
                </div>
                <p className="text-white font-semibold">Welcome back!</p>
                <p className="text-slate-400 text-sm mt-1">Redirecting to dashboard…</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-lg font-semibold text-white mb-5">Sign In</h2>

                <InputField label="Email" type="email" value={email} onChange={setEmail}
                  placeholder="you@example.com" icon={Mail} />
                <InputField label="Password" type="password" value={password} onChange={setPassword}
                  placeholder="Your password" icon={Lock} hint="Demo: admin@infoshield.ai / admin123" />

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3 mt-1 disabled:opacity-60"
                >
                  {loading ? <><Loader className="w-4 h-4 animate-spin" /> Signing in…</> : <><Lock className="w-4 h-4" /> Sign In</>}
                </button>

                <p className="text-center text-xs text-slate-500 mt-5">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-primary hover:underline">Create one</Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          <Link to="/" className="hover:text-slate-400 transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  );
}

// ──────────── SIGNUP PAGE ────────────
export function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.includes('@')) e.email = 'Enter a valid email address';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirm) e.confirm = "Passwords don't match";

    const existing = getUsers()[email.toLowerCase()];
    if (existing) e.email = 'This email is already registered';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    saveUser(email.toLowerCase(), name.trim(), password);
    setSuccess(true);
    // Redirect to email verification instead of dashboard
    setTimeout(() => navigate('/verify-email', { state: { email: email.toLowerCase() } }), 1000);
    setLoading(false);
  };

  // Password strength
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden py-8">
      <div className="absolute inset-0 cyber-grid opacity-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent-purple/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' as const }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple to-primary flex items-center justify-center mb-4 shadow-glow">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">InfoShield AI</h1>
          <p className="text-slate-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="glass-card">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <p className="text-white font-semibold">Account created!</p>
                <p className="text-slate-400 text-sm mt-1">Redirecting to email verification…</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-lg font-semibold text-white mb-5">Create Account</h2>

                <InputField label="Full Name" type="text" value={name} onChange={setName}
                  placeholder="Jane Smith" icon={Shield} error={errors.name} />
                <InputField label="Email" type="email" value={email} onChange={setEmail}
                  placeholder="you@example.com" icon={Mail} error={errors.email} />
                <InputField label="Password" type="password" value={password} onChange={setPassword}
                  placeholder="Min 6 characters" icon={Lock} error={errors.password} />

                {/* Password strength */}
                {password.length > 0 && (
                  <div className="mb-4 -mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map((s) => (
                        <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: strength >= s ? strengthColor[strength] : 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</p>
                  </div>
                )}

                <InputField label="Confirm Password" type="password" value={confirm} onChange={setConfirm}
                  placeholder="Repeat password" icon={Lock} error={errors.confirm} />

                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3 mt-1 disabled:opacity-60"
                >
                  {loading
                    ? <><Loader className="w-4 h-4 animate-spin" /> Creating account…</>
                    : <><CheckCircle className="w-4 h-4" /> Create Account</>
                  }
                </button>

                <p className="text-center text-xs text-slate-500 mt-5">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline">Sign in</Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          <Link to="/" className="hover:text-slate-400 transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  );
}
