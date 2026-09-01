// ─── useAutoRefresh ──────────────────────────────────────────────────────────
// Custom hook that manages a background setInterval for every tracked exam
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
//  • Notification dispatch is handled via notificationService.
//    The caller (App.jsx) must have already requested permission once.

import { useEffect, useRef } from 'react';
import { fetchSiteValue } from '../utils/fetcher';
import { dispatchNotifications } from '../utils/notificationService';
import { loadSettings } from '../utils/localStorage';

/**
 * Registers/clears setInterval timers for every tracker that has an
 * autoRefreshInterval > 0. Fires notifications on value change.
 *
 * @param {Array}    sites    - The full tracked-exams array from state.
 * @param {Function} onUpdate - Same callback as in App: (id, patch) => void.
 */
export function useAutoRefresh(sites, onUpdate) {
  // Always-current refs so interval callbacks never capture stale values.
  const sitesRef    = useRef(sites);
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
          const now = new Date().toISOString();

          // Build history entry if changed
          const historyEntry = changed
            ? {
                timestamp: now,
                oldValue: current.lastKnownValue,
                newValue,
                type: current.monitorType || 'other',
              }
            : null;

          onUpdateRef.current(current.id, {
            lastKnownValue:       newValue,
            previousValue:        changed ? current.lastKnownValue : current.previousValue,
            lastUpdatedTimestamp:  now,
            lastChangedTimestamp:  changed ? now : current.lastChangedTimestamp,
            hasChanged:           changed,
            status:               'monitoring',
            errorMessage:         null,
            ...(historyEntry ? { historyEntry } : {}),
          });

          // ── Dispatch notifications ────────────────────────────────────
          if (changed) {
            const settings = loadSettings();
            dispatchNotifications(
              { ...current, lastKnownValue: newValue, previousValue: current.lastKnownValue },
              settings
            );
          }
        } catch (err) {
          // Update status to error but don't break the card
          onUpdateRef.current(current.id, {
            status: 'error',
            errorMessage: err.message,
            lastUpdatedTimestamp: new Date().toISOString(),
          });
          console.warn(
            `[ExamPulse] Auto-refresh failed for "${current.siteName}":`,
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
