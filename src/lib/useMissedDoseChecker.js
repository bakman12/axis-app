// useMissedDoseChecker.js
// Runs on mount and whenever the app comes back into focus (Page Visibility API).
// For every scheduled dose that is >2 hours overdue with no log, auto-creates a
// 'missed' entry so the history stays accurate without manual intervention.

import { useEffect, useRef } from 'react';
import { entities } from '@/lib/encryptedBase44Client';

const MISSED_WINDOW_MINUTES = 120;
const DEBOUNCE_MS = 10 * 60 * 1000; // don't recheck more than once every 10 minutes

export function useMissedDoseChecker(medications, todayLogs, queryClient) {
  const lastCheckRef = useRef(0);

  useEffect(() => {
    const check = async () => {
      const now = Date.now();
      if (now - lastCheckRef.current < DEBOUNCE_MS) return;
      lastCheckRef.current = now;

      const currentDate = new Date();
      const nowMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

      const toCreate = [];

      for (const med of (medications ?? [])) {
        for (const time of (med.times ?? [])) {
          const [h, m] = time.split(':').map(Number);
          const scheduledMinutes = h * 60 + m;
          const minutesPast = nowMinutes - scheduledMinutes;

          if (minutesPast < MISSED_WINDOW_MINUTES) continue;

          const alreadyLogged = (todayLogs ?? []).some(
            log => log.medication_id === med.id && log.scheduled_time === time
          );
          if (alreadyLogged) continue;

          toCreate.push({ med, time });
        }
      }

      if (toCreate.length === 0) return;

      await Promise.all(toCreate.map(({ med, time }) =>
        /** @type {any} */ (entities).MedicationLog.create({
          medication_id:   med.id,
          medication_name: med.name,
          scheduled_time:  time,
          taken_time:      new Date().toISOString(),
          status:          'missed',
          delay_minutes:   0,
        })
      ));

      queryClient.invalidateQueries({ queryKey: ['logs', 'today'] });
    };

    check();

    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [medications, todayLogs, queryClient]);
}
