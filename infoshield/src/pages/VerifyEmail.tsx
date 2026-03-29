import { useState, useRef, useEffect, type ElementType, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';
import { createVerification, validateOTP, markVerified } from '../services/otpService';

// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';

function Toast({ msg, type, onClose }: { msg: string; type: ToastType; onClose: () => void }) {
  const colors: Record<ToastType, string> = {
    success: 'bg-green-500/20 border-green-500/40 text-green-300',
    error: 'bg-red-500/20 border-red-500/40 text-red-300',
    info: 'bg-primary/20 border-primary/40 text-primary',
  };
  const icons: Record<ToastType, ElementType> = { success: CheckCircle, error: AlertCircle, info: Mail };
  const Icon = icons[type];

  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type]} text-sm shadow-2xl max-w-xs`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{msg}</span>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email: string = (location.state as { email?: string })?.email ?? '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'expired'>('idle');
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type: ToastType }>>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const toastIdRef = useRef(0);

  const addToast = (msg: string, type: ToastType) => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
  };

  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Countdown tick
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleDigitChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[idx] = val.slice(-1);
    setDigits(newDigits);
    setStatus('idle');
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'Enter') void handleVerify();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] ?? '';
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 6) { addToast('Enter all 6 digits', 'error'); return; }
    if (!email) { addToast('Email not found. Please sign up again.', 'error'); return; }
    setStatus('loading');
    await new Promise<void>((r) => setTimeout(r, 900));
    const result = validateOTP(email, code);
    if (result === 'valid') {
      markVerified(email);
      setStatus('success');
      addToast('Email verified successfully!', 'success');
      setTimeout(() => navigate('/dashboard'), 1800);
    } else if (result === 'expired') {
      setStatus('expired');
      addToast('Code expired. Please request a new one.', 'error');
    } else {
      setAttempts((a) => a + 1);
      setStatus('error');
      addToast(`Invalid code${attempts >= 2 ? '. Tip: check console for the latest code' : ''}`, 'error');
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    const newOtp = createVerification(email);
    // In production: trigger email API here
    console.info('[InfoShield Dev] New OTP:', newOtp);
    setDigits(['', '', '', '', '', '']);
    setStatus('idle');
    setAttempts(0);
    setResendCooldown(60);
    addToast(`New code sent to ${email} (Dev: check console)`, 'info');
    inputRefs.current[0]?.focus();
  };

  const otp = digits.join('');

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 cyber-grid opacity-20" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent-purple/5 rounded-full blur-3xl pointer-events-none" />

      {/* Toast stack */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} msg={t.msg} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-glow">
              <Mail className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Verify Your Email</h1>
          <p className="text-slate-400 text-sm mt-2 text-center">
            We sent a 6-digit code to<br />
            <span className="text-primary font-medium">{email || 'your email'}</span>
          </p>
        </div>

        <div className="glass-card">
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', duration: 0.6 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1, duration: 0.6 }}
                  className="relative w-20 h-20 mb-5"
                >
                  {[1, 1.5, 2].map((scale, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0.8 }}
                      animate={{ scale: scale * 1.4, opacity: 0 }}
                      transition={{ delay: 0.2 + i * 0.15, duration: 0.8 }}
                      className="absolute inset-0 rounded-full bg-green-500/30"
                    />
                  ))}
                  <div className="relative w-full h-full rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                </motion.div>
                <Sparkles className="w-5 h-5 text-primary mb-3 animate-pulse" />
                <h2 className="text-xl font-bold text-white mb-2">Email Verified!</h2>
                <p className="text-slate-400 text-sm">Redirecting to your dashboard…</p>
                <div className="mt-4 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ y: [-4, 0, -4] }}
                      transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-lg font-semibold text-white mb-2">Enter Verification Code</h2>
                <p className="text-xs text-slate-500 mb-6">
                  Check your email inbox (and spam). Code expires in 5 minutes.
                </p>

                {/* OTP Boxes */}
                <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <motion.input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      animate={status === 'error' ? { x: [-6, 6, -6, 6, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className={[
                        'w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all duration-200',
                        'bg-white/5 border backdrop-blur-sm',
                        status === 'error'
                          ? 'border-red-500/60 bg-red-500/10 text-red-300'
                          : d
                          ? 'border-primary/60 bg-primary/10 text-primary'
                          : 'border-white/10 text-white',
                      ].join(' ')}
                      style={{ caretColor: 'transparent' }}
                    />
                  ))}
                </div>

                {/* Status message */}
                <AnimatePresence>
                  {(status === 'error' || status === 'expired') && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4"
                    >
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {status === 'expired'
                        ? 'Code expired. Request a new one below.'
                        : `Incorrect code. ${3 - attempts > 0 ? `${3 - attempts} attempt(s) left.` : 'Too many attempts.'}`}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Verify button */}
                <button
                  id="verify-otp-btn"
                  onClick={() => void handleVerify()}
                  disabled={status === 'loading' || otp.length < 6}
                  className="btn-primary w-full justify-center py-3 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-dark/40 border-t-dark rounded-full"
                    />
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Verify Email
                    </>
                  )}
                </button>

                {/* Resend */}
                <div className="text-center">
                  <button
                    id="resend-otp-btn"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive it? Resend code"}
                  </button>
                </div>

                {/* Dev hint */}
                <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-slate-500 text-center">
                    🧪 <span className="text-primary/80">Dev mode:</span> OTP is logged to browser console (F12).
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
