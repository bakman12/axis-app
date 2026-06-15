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

/**
 * How many days ahead to schedule individual alarms.
 *
 * Why 7 (not 14)?
 *   iOS hard-limits an app to 64 pending local notifications. With 7-day
 *   windows we stay under that cap for up to 9 medications × 1 dose/day, or
 *   3 meds × 3 doses/day. Reschedule on every app open keeps the window
 *   topped up — so 7 days of lead time is always available without ever
 *   silently dropping alarms.
 */
const SCHEDULE_DAYS = 7;

/** Safety cap matching iOS's hard limit on pending local notifications. */
const MAX_NOTIFICATIONS_PER_APP = 60; // 64 minus a small safety margin

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

/**
 * Build the Date for a given HH:MM time, N days from today.
 *
 * Captures `now` once at entry so:
 *   1. The "is this slot past today?" check and the day-increment see the
 *      same moment — no midnight race.
 *   2. day=0 (past) and day=1 don't both collapse to "tomorrow" — the result
 *      is a unique calendar day per dayOffset value.
 *
 * NOTE on DST: this naive setHours+setDate approach can drift alarms by ±1
 * hour for SCHEDULE_DAYS days after a DST transition, because setHours sets
 * the wall clock at `now`'s TZ offset and setDate then carries that offset
 * across the boundary. We accept that for now — twice-a-year drift in a
 * subset of timezones is far less damaging than the regression caused by
 * the alternative (the engine in Capacitor's Android WebView interpreted
 * the rebuilt-from-components Date as immediate-fire, causing every alarm
 * to push the moment scheduleAllMedicationNotifications ran).
 */
function dateForTime(timeStr, dayOffset, now) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  // If this slot is already past today, base off tomorrow instead.
  if (date <= now) date.setDate(date.getDate() + 1);
  // Then apply the requested day offset.
  if (dayOffset > 0) date.setDate(date.getDate() + dayOffset);
  return date;
}

/** Defensive guard: never schedule an alarm to fire within MIN_LEAD_MS of now. */
const MIN_LEAD_MS = 60 * 1000; // 1 minute

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
 *
 * @param {object} medication
 * @param {number} [budget=Infinity] — max notifications to schedule (iOS cap support)
 * @returns {Promise<number>} how many notifications were actually scheduled
 */
export async function scheduleMedicationNotifications(medication, budget = Infinity) {
  if (!medication?.times?.length) return 0;
  if (budget <= 0) return 0;

  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return 0;

  const isCritical = !!medication.critical;
  const channelId  = isCritical ? 'critical-medication-reminders' : 'medication-reminders';
  const actionTypeId = isCritical ? 'CRITICAL_MEDICATION_ACTIONS' : 'MEDICATION_ACTIONS';

  const notifications = [];
  const now = new Date(); // single timestamp for the whole scheduling pass

  // Build candidates in chronological order so we keep the soonest ones first
  // when budget cuts us off.
  //
  // Two guards on each candidate:
  //   1. fireAt > now            — never reschedule something in the past
  //   2. fireAt - now >= MIN_LEAD_MS — never schedule something that fires
  //      within the next minute. This protects against any future bug in
  //      dateForTime: even if the calc were wrong, the worst case is the
  //      alarm gets pushed by one day rather than firing immediately on
  //      every app open.
  const minFireTime = now.getTime() + MIN_LEAD_MS;
  const candidates = [];
  for (const time of medication.times) {
    for (let day = 0; day < SCHEDULE_DAYS; day++) {
      const fireAt = dateForTime(time, day, now);
      if (fireAt.getTime() < minFireTime) continue;
      candidates.push({ time, day, fireAt });
    }
  }
  candidates.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());

  for (const { time, day, fireAt } of candidates) {
    if (notifications.length >= budget) break;

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

  if (notifications.length === 0) return 0;

  try {
    await LocalNotifications.schedule({ notifications });
    return notifications.length;
  } catch (e) {
    console.warn('Failed to schedule notifications for', medication.name, ':', e);
    return 0;
  }
}

/**
 * Cancel all notifications for a medication (all day-offsets).
 */
export async function cancelMedicationNotifications(medication) {
  if (!medication?.times?.length) return;

  // Cancel a wider window than SCHEDULE_DAYS so we clean up any leftover IDs
  // from a previous app version that used a longer window (e.g. 14 days).
  const CANCEL_HORIZON = 21;
  const toCancel = [];
  for (const time of medication.times) {
    for (let day = 0; day < CANCEL_HORIZON; day++) {
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
 * Strategy: cancel everything, then re-schedule honouring the iOS 64-notification
 * cap. If the budget is exhausted, critical medications are prioritised over
 * normal ones, and earlier fire-times beat later ones.
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

  // Sort so critical meds are scheduled first — they keep their slots if the
  // total would exceed the iOS cap.
  const active = medications
    .filter(m => m.active !== false)
    .sort((a, b) => (b.critical ? 1 : 0) - (a.critical ? 1 : 0));

  if (active.length === 0) return;

  // Fair share: every medication gets at least an equal slice of the budget,
  // so a user with 5 meds × 3 times/day doesn't have meds 4 & 5 get zero
  // notifications. Each med can schedule up to its fair share; any unused
  // budget rolls over to the next med in priority order.
  const fairShare = Math.max(
    1,
    Math.floor(MAX_NOTIFICATIONS_PER_APP / active.length),
  );

  let remaining = MAX_NOTIFICATIONS_PER_APP;
  for (let i = 0; i < active.length; i++) {
    if (remaining <= 0) break;
    // For the last medication, give it whatever's left.
    const medsRemaining = active.length - i;
    const myBudget = i === active.length - 1
      ? remaining
      : Math.min(fairShare + Math.max(0, remaining - fairShare * medsRemaining), remaining);
    const scheduled = await scheduleMedicationNotifications(active[i], myBudget);
    remaining -= scheduled;
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
