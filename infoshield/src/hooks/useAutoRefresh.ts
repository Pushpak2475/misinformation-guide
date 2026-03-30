/**
 * useAutoRefresh.ts  v2 — Fixed double-fire and stale-closure guard
 *
 * Key fixes vs v1:
 *  - isRefreshingRef tracks in-flight state reliably (no stale closure)
 *  - runRefresh is NOT a useCallback (avoids eslint-hooks pitfall)
 *  - lastRefreshStartRef initialised to Date.now() so countdown starts right
 *  - forceRefresh cancels the old interval + restarts cleanly
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface AutoRefreshState {
  /** Seconds remaining until the next auto-refresh */
  secondsLeft: number;
  /** True while the refresh callback is running */
  isRefreshing: boolean;
  /** Human-readable time of the last successful refresh */
  lastRefreshed: string;
  /** Call this to trigger an immediate refresh and reset the countdown */
  forceRefresh: () => void;
}

export function useAutoRefresh(
  onRefresh: () => Promise<void>,
  intervalMs: number = AUTO_REFRESH_INTERVAL_MS
): AutoRefreshState {
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [secondsLeft, setSecondsLeft]     = useState(intervalMs / 1000);

  // Stable refs — avoids stale closure issues
  const onRefreshRef       = useRef(onRefresh);
  const isRefreshingRef    = useRef(false);           // ← guards double-fire reliably
  const lastRefreshStart   = useRef(Date.now());
  const intervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep onRefreshRef current without restarting timers
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  // Core refresh runner — reads from refs so it's always fresh
  const runRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return; // ← reliable guard
    isRefreshingRef.current = true;
    lastRefreshStart.current = Date.now();
    setIsRefreshing(true);
    setSecondsLeft(intervalMs / 1000);
    try {
      await onRefreshRef.current();
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('[useAutoRefresh] refresh threw:', e);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [intervalMs]);

  // forceRefresh — resets the interval so countdown starts from full again
  const forceRefresh = useCallback(() => {
    if (intervalRef.current)  clearInterval(intervalRef.current);
    void runRefresh();
    intervalRef.current = setInterval(() => void runRefresh(), intervalMs);
  }, [runRefresh, intervalMs]);

  // Mount: fire immediately, set up auto-interval and countdown ticker
  useEffect(() => {
    // Initial fire
    void runRefresh();

    // Auto-refresh interval
    intervalRef.current = setInterval(() => void runRefresh(), intervalMs);

    // Countdown ticker (1 s resolution)
    countdownRef.current = setInterval(() => {
      const elapsed  = (Date.now() - lastRefreshStart.current) / 1000;
      const remaining = Math.max(0, intervalMs / 1000 - elapsed);
      setSecondsLeft(Math.ceil(remaining));
    }, 1000);

    return () => {
      if (intervalRef.current)  clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  return { secondsLeft, isRefreshing, lastRefreshed, forceRefresh };
}

/** Format seconds as MM:SS for display */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
