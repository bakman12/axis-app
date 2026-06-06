// NotificationService.js
// ─────────────────────────────────────────────────────────────────────────────
// Schedules and manages local medication reminder notifications.
// Uses @capacitor/local-notifications — fires natively on Android/iOS even
// when the app is completely closed.
//
// KEY DESIGN DECISIONS
// ─────────────────────
// 1. NO repeating notifications (repeats: true breaks on Android 12+ Doze).
//    Instead we schedule INDIVIDUAL exact alarms for the next SCHEDULE_DAYS days.
//    On each app open, we top-up the window so there are always upcoming alarms.
//
// 2. TWO notification channels:
//    • "medication-reminders"          — normal medications
//    • "critical-medication-reminders" — critical: true medications
//      → Different sound, maximum importance, ongoing (won't auto-dismiss)
//
// 3. allowWhileIdle: true on every schedule so Android Doze can't defer them.
// ─────────────────────────────────────────────────────────────────────────────

import { LocalNotifications } from '@capacitor/local-notifications';

/** How many days ahead to schedule individual alarms. */
const SCHEDULE_DAYS = 14;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Stable integer ID from medication ID + time + day-offset. */
function notificationId(medicationId, time, dayOffset = 0) {
  const str = `${medicationId}::${time}::d${dayOffset}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2_000_000_000;
}

/** Build the Date for a given HH:MM time, N days from today. */
function dateForTime(timeStr, dayOffset = 0) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  if (dayOffset > 0 || date <= new Date()) date.setDate(date.getDate() + dayOffset + (date <= new Date() && dayOffset === 0 ? 1 : 0));
  return date;
}

/** Format HH:MM → "8:00 AM" style for notification body. */
function formatTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function requestNotificationPermission() {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function hasNotificationPermission() {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

// ─── Channels ────────────────────────────────────────────────────────────────

/**
 * Create both notification channels.
 * Must be called once at app startup BEFORE scheduling any notifications.
 *
 * Channel 1 — Normal medications:
 *   Importance 4 (HIGH), heads-up, custom sound, vibration, lights
 *
 * Channel 2 — Critical medications:
 *   Importance 5 (URGENT/MAX), different sound, ongoing, lights red
 */
export async function createNotificationChannel() {
  try {
    // Normal reminders channel
    await LocalNotifications.createChannel({
      id:          'medication-reminders',
      name:        'Medication Reminders',
      description: 'Daily reminders to take your medications',
      importance:  4,   // IMPORTANCE_HIGH — heads-up, no lock-screen bypass
      visibility:  1,   // VISIBILITY_PUBLIC
      sound:       'default',
      vibration:   true,
      lights:      true,
      lightColor:  '#C75B3A',
    });

    // Critical medications channel — maximum urgency
    await LocalNotifications.createChannel({
      id:          'critical-medication-reminders',
      name:        'Critical Medication Alerts',
      description: 'Urgent reminders for critical medications — cannot be missed',
      importance:  5,   // IMPORTANCE_MAX — full-screen intent on Android
      visibility:  1,   // VISIBILITY_PUBLIC — shows on lock screen
      sound:       'alarm',   // uses the device alarm sound (louder)
      vibration:   true,
      lights:      true,
      lightColor:  '#FF0000', // red LED
    });
  } catch (e) {
    console.warn('createNotificationChannel failed:', e);
  }
}

// ─── Action types ─────────────────────────────────────────────────────────────

export async function registerNotificationActions() {
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'MEDICATION_ACTIONS',
          actions: [
            { id: 'TAKEN',  title: 'Mark Taken',  foreground: false },
            { id: 'SNOOZE', title: 'Snooze 10m',  foreground: false },
          ],
        },
        {
          id: 'CRITICAL_MEDICATION_ACTIONS',
          actions: [
            { id: 'TAKEN',  title: 'Mark Taken',  foreground: true  }, // open app for critical
            { id: 'SNOOZE', title: 'Snooze 10m',  foreground: false },
          ],
        },
      ],
    });
  } catch (e) {
    console.warn('registerNotificationActions failed:', e);
  }
}

// ─── Scheduling ──────────────────────────────────────────────────────────────

/**
 * Schedule individual exact-alarm notifications for a single medication
 * covering the next SCHEDULE_DAYS days.
 *
 * Why individual instead of repeating?
 *   Android 12+ Doze mode aggressively defers inexact repeating alarms.
 *   Individual exact alarms (allowWhileIdle: true) fire reliably even in Doze.
 */
export async function scheduleMedicationNotifications(medication) {
  if (!medication?.times?.length) return;

  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  const isCritical = !!medication.critical;
  const channelId  = isCritical ? 'critical-medication-reminders' : 'medication-reminders';
  const actionTypeId = isCritical ? 'CRITICAL_MEDICATION_ACTIONS' : 'MEDICATION_ACTIONS';

  const notifications = [];

  for (const time of medication.times) {
    for (let day = 0; day < SCHEDULE_DAYS; day++) {
      const fireAt = dateForTime(time, day);
      // Skip times that are in the past (day 0, already-passed slot)
      if (fireAt <= new Date()) continue;

      const title = isCritical
        ? `⚠️ ${medication.name} — Critical dose`
        : `Medication reminder`;

      const body = isCritical
        ? `Do not skip — take ${medication.name}${medication.dosage ? ` ${medication.dosage}` : ''} now (${formatTime(time)})`
        : `Time to take ${medication.name}${medication.dosage ? ` — ${medication.dosage}` : ''} (${formatTime(time)})`;

      notifications.push({
        id:           notificationId(medication.id, time, day),
        title,
        body,
        actionTypeId,
        channelId,
        sound:        isCritical ? 'alarm' : undefined,
        // ongoing: critical notifications persist until manually dismissed
        ongoing:      isCritical,
        // autoCancel: normal → tap to dismiss; critical → must open app or swipe
        autoCancel:   !isCritical,
        // timeoutAfter: how long until Android auto-cancels (ms)
        // Critical: never auto-cancel (0 = no timeout); Normal: 30 min
        timeoutAfter: isCritical ? 0 : 30 * 60 * 1000,
        schedule: {
          at:             fireAt,
          allowWhileIdle: true, // fires in Android Doze — essential for reliability
        },
        smallIcon: 'ic_notification',
        extra: {
          medicationId:  medication.id,
          scheduledTime: time,
          dayOffset:     day,
          critical:      isCritical,
        },
      });
    }
  }

  if (notifications.length === 0) return;

  try {
    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.warn('Failed to schedule notifications for', medication.name, ':', e);
  }
}

/**
 * Cancel all notifications for a medication (all day-offsets).
 */
export async function cancelMedicationNotifications(medication) {
  if (!medication?.times?.length) return;

  const toCancel = [];
  for (const time of medication.times) {
    for (let day = 0; day < SCHEDULE_DAYS; day++) {
      toCancel.push({ id: notificationId(medication.id, time, day) });
    }
  }

  try {
    await LocalNotifications.cancel({ notifications: toCancel });
  } catch (e) {
    console.warn('Failed to cancel notifications:', e);
  }
}

/**
 * Reschedule after a medication is edited.
 */
export async function rescheduleMedicationNotifications(oldMedication, newMedication) {
  await cancelMedicationNotifications(oldMedication);
  await scheduleMedicationNotifications(newMedication);
}

/**
 * Schedule notifications for ALL active medications.
 * Call on app start to recover from: reinstall, OS alarm clear, device reboot.
 *
 * Strategy: cancel everything and rebuild from scratch.
 * With 14-day windows this is at most ~14 × times × medications notifications —
 * well within Android/iOS limits.
 */
export async function scheduleAllMedicationNotifications(medications) {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  // Wipe all existing Axis notifications to avoid duplicates
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch {}

  // Re-schedule each active medication
  for (const med of medications) {
    if (med.active !== false) {
      await scheduleMedicationNotifications(med);
    }
  }
}

// ─── Refill alerts ────────────────────────────────────────────────────────────

function dosesPerDay(frequency) {
  return {
    daily: 1, twice_daily: 2, three_times_daily: 3, four_times_daily: 4,
    every_6_hours: 4, every_8_hours: 3, every_12_hours: 2, weekly: 1 / 7,
  }[frequency] ?? 1;
}

/**
 * Fire a one-shot "low stock" notification.
 * Safe to call after every dose log.
 */
export async function checkAndNotifyLowStock(medication) {
  if (medication?.quantity_remaining == null) return;

  const dpd      = dosesPerDay(medication.frequency);
  const daysLeft = medication.quantity_remaining / dpd;
  const threshold = medication.refill_reminder_days ?? 7;

  if (daysLeft > threshold) return;

  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id:        notificationId(medication.id, 'refill', 0),
        title:     'Refill reminder',
        body:      `${medication.name} is running low — ${medication.quantity_remaining} doses left (~${Math.floor(daysLeft)} days). Request a refill soon.`,
        channelId: 'medication-reminders',
        autoCancel: true,
        schedule:  { at: new Date(Date.now() + 3000), allowWhileIdle: true },
        extra:     { type: 'refill', medicationId: medication.id },
      }],
    });
  } catch {}
}
