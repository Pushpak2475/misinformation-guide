import { lazy, Suspense, Component, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import SkeletonLoader from './components/ui/SkeletonLoader';

// Lazy-loaded pages (code splitting for performance)
const Landing      = lazy(() => import('./pages/Landing'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const CheckNews    = lazy(() => import('./pages/CheckNews'));
const Admin        = lazy(() => import('./pages/Admin'));
const RSSFeeds     = lazy(() => import('./pages/RSSFeeds'));
const ActiveAlerts = lazy(() => import('./pages/ActiveAlerts'));
const LiveStream   = lazy(() => import('./pages/LiveStream'));
const NewsHub      = lazy(() => import('./pages/NewsHub'));
const SourcesPanel = lazy(() => import('./pages/SourcesPanel'));
const CounterPost  = lazy(() => import('./pages/CounterPost'));
const TruthTrace   = lazy(() => import('./pages/TruthTrace'));
const VerifyEmail  = lazy(() => import('./pages/VerifyEmail'));

// Auth pages — imported directly (small, needed immediately)
import { Login, Signup } from './pages/Auth';
import './index.css';

// ─── Error Boundary ──────────────────────────────────────────────────────────
interface EBState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[InfoShield] Component crash:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#050b18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ maxWidth: 640, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 32 }}>
            <h2 style={{ color: '#ef4444', fontFamily: 'monospace', marginBottom: 12 }}>⚠ Runtime Error</h2>
            <pre style={{ color: '#fca5a5', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ marginTop: 20, padding: '8px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageFallback() {
  return <SkeletonLoader type="page" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/"              element={<Landing />} />
              <Route path="/login"         element={<Login />} />
              <Route path="/signup"        element={<Signup />} />
              <Route path="/verify-email"  element={<VerifyEmail />} />
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/check-news"    element={<CheckNews />} />
              <Route path="/admin"         element={<Admin />} />
              <Route path="/rss-feeds"     element={<RSSFeeds />} />
              <Route path="/active-alerts" element={<ActiveAlerts />} />
              <Route path="/live-stream"   element={<LiveStream />} />
              {/* New features */}
              <Route path="/news-hub"      element={<NewsHub />} />
              <Route path="/sources"       element={<SourcesPanel />} />
              <Route path="/counter-post"  element={<CounterPost />} />
              <Route path="/truth-trace"   element={<TruthTrace />} />
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

