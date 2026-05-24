// ─── useAutoRefresh ──────────────────────────────────────────────────────────
// Custom hook that manages a background setInterval for every tracked site
// whose autoRefreshInterval > 0.
//
// Design decisions:
//  • We keep a `sitesRef` so interval callbacks always read the *latest* site
//    data (including the most recent lastKnownValue) without capturing stale
//    closures — crucial for correct change-detection.
//
//  • Intervals are only recreated when the set of (id → interval) mappings
//    actually changes (the `intervalKey` dependency). A plain value update
//    (e.g. lastKnownValue changing after a fetch) does NOT reset the timers.
//
//  • Browser Notification API is used when the value changes. The caller
//    (App.jsx) must have already called Notification.requestPermission() once.

import { useEffect, useRef } from 'react';
import { fetchSiteValue } from '../utils/fetcher';

/**
 * Registers/clears setInterval timers for every site that has an
 * autoRefreshInterval > 0.  Fires a browser Notification on value change.
 *
 * @param {Array}    sites    - The full tracked-sites array from state.
 * @param {Function} onUpdate - Same callback as in App: (id, patch) => void.
 */
export function useAutoRefresh(sites, onUpdate) {
  // Always-current refs so interval callbacks never capture stale values.
  const sitesRef   = useRef(sites);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => { sitesRef.current   = sites;    }, [sites]);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  // Build a stable key that changes only when an interval setting is added,
  // removed, or modified — not when a fetched value changes.
  const intervalKey = sites
    .map((s) => `${s.id}:${s.autoRefreshInterval ?? 0}`)
    .join('|');

  useEffect(() => {
    const timers = {};

    sitesRef.current.forEach((site) => {
      const minutes = site.autoRefreshInterval ?? 0;
      if (minutes <= 0) return; // Off — no timer for this site.

      const ms = minutes * 60 * 1000;

      timers[site.id] = setInterval(async () => {
        // Read the *current* site snapshot so we compare against the latest
        // known value, not the value from when the timer was created.
        const current = sitesRef.current.find((s) => s.id === site.id);
        if (!current) return; // Site was deleted while timer was running.

        try {
          const newValue = await fetchSiteValue(
            current.targetUrl,
            current.cssSelector
          );

          const changed = newValue !== current.lastKnownValue;

          onUpdateRef.current(current.id, {
            lastKnownValue:       newValue,
            lastUpdatedTimestamp: new Date().toISOString(),
            hasChanged:           changed,
          });

          // ── Browser desktop notification ────────────────────────────────
          if (changed && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`SitePulse · ${current.siteName} updated!`, {
              body: newValue.slice(0, 120),
              icon: '/favicon.ico',
              tag:  current.id, // de-duplicates: a new notif replaces the old one
            });
          }
        } catch (err) {
          // Silently log auto-refresh failures — don't show error on the card
          // (the user didn't explicitly trigger this fetch).
          console.warn(
            `[SitePulse] Auto-refresh failed for "${current.siteName}":`,
            err.message
          );
        }
      }, ms);
    });

    // Cleanup: clear all timers when interval settings change or on unmount.
    return () => {
      Object.values(timers).forEach(clearInterval);
    };
  }, [intervalKey]); // eslint-disable-line react-hooks/exhaustive-deps
}
