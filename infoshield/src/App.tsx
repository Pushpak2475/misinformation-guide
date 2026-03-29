import { lazy, Suspense } from 'react';
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

function PageFallback() {
  return <SkeletonLoader type="page" />;
}

export default function App() {
  return (
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
  );
}
