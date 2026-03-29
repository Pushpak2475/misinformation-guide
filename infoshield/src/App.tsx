import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CheckNews from './pages/CheckNews';
import Admin from './pages/Admin';
import RSSFeeds from './pages/RSSFeeds';
import ActiveAlerts from './pages/ActiveAlerts';
import LiveStream from './pages/LiveStream';
import { Login, Signup } from './pages/Auth';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/"              element={<Landing />} />
          <Route path="/login"         element={<Login />} />
          <Route path="/signup"        element={<Signup />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/check-news"    element={<CheckNews />} />
          <Route path="/admin"         element={<Admin />} />
          <Route path="/rss-feeds"     element={<RSSFeeds />} />
          <Route path="/active-alerts" element={<ActiveAlerts />} />
          <Route path="/live-stream"   element={<LiveStream />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
