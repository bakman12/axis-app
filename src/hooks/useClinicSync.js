// useClinicSync.js
// ─────────────────────────────────────────────────────────────────────────────
// React hook that fires the daily adherence sync when the app opens or returns
// to the foreground. Fire-and-forget — never blocks the UI.
//
// Usage: call once in Home.jsx (or wherever today's medications/logs are loaded)
//   useClinicSync(medications, todayLogs);
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { syncTodayAdherence, isConsentActive } from '@/lib/clinicSync';

/**
 * @param {object[]} medications — active medications (from useQuery)
 * @param {object[]} todayLogs   — today's dose logs (from useQuery)
 */
export function useClinicSync(medications, todayLogs) {
  useEffect(() => {
    // Only run when both data sets are loaded and consent is active
    if (!medications?.length || !todayLogs) return;
    if (!isConsentActive()) return;

    // Fire once on mount (app open / page load)
    syncTodayAdherence(medications, todayLogs);

    // Also fire when app comes back to foreground (e.g. user switches apps)
    const onVisible = () => {
      if (!document.hidden) {
        syncTodayAdherence(medications, todayLogs);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [medications, todayLogs]);
}
