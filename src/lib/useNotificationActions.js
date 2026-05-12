// useNotificationActions.js
// Listens for taps on the "Mark Taken" action button in the notification shade.
// Creates a MedicationLog entry and decrements stock — same as tapping "Taken"
// inside the app, but without requiring the user to open it.

import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { entities } from '@/lib/encryptedBase44Client';
import { useQueryClient } from '@tanstack/react-query';
import { checkAndNotifyLowStock } from './NotificationService';
import { logAuditEvent, AUDIT } from './auditLog';

export function useNotificationActions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const listenerPromise = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      async (event) => {
        if (event.actionId !== 'TAKEN') return;

        const { medicationId, scheduledTime } = event.notification?.extra ?? {};
        if (!medicationId || !scheduledTime) return;

        try {
          const meds = await /** @type {any} */ (entities).Medication.filter({ active: true });
          const med  = meds.find((m) => m.id === medicationId);
          if (!med) return;

          await /** @type {any} */ (entities).MedicationLog.create({
            medication_id:   medicationId,
            medication_name: med.name,
            scheduled_time:  scheduledTime,
            taken_time:      new Date().toISOString(),
            status:          'taken',
            delay_minutes:   0,
          });

          // Decrement stock
          if (med.quantity_remaining != null) {
            const newQty = Math.max(0, med.quantity_remaining - 1);
            await /** @type {any} */ (entities).Medication.update(medicationId, { quantity_remaining: newQty });
            await checkAndNotifyLowStock({ ...med, quantity_remaining: newQty });
          }

          logAuditEvent(AUDIT.DOSE_LOGGED, { name: med.name, via: 'notification_action' });
          queryClient.invalidateQueries({ queryKey: ['logs', 'today'] });
          queryClient.invalidateQueries({ queryKey: ['medications', 'all'] });
        } catch {}
      }
    );

    return () => { listenerPromise.then(l => l.remove()); };
  }, [queryClient]);
}
