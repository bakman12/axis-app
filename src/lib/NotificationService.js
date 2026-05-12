// NotificationService.js
// ─────────────────────────────────────────────────────────────────────────────
// Schedules and manages local medication reminder notifications.
// Uses @capacitor/local-notifications which works on Android and iOS natively.
// In a browser (PWA) the web fallback is a no-op — notifications won't fire.
//
// HOW IT WORKS:
//   Each medication + time combination gets a unique, deterministic notification
//   ID derived from the medication's database ID and the scheduled time string.
//   This means we can cancel individual notifications precisely when a medication
//   is edited or deleted, without affecting other scheduled reminders.
//
// SCHEDULING:
//   Notifications are daily-repeating — scheduled once, fire every 24 hours.
//   If the scheduled time has already passed today, the first fire is tomorrow.
// ─────────────────────────────────────────────────────────────────────────────

import { LocalNotifications } from '@capacitor/local-notifications';

// Convert a medication ID string + time string into a stable integer ID.
// LocalNotifications requires integer IDs.
function notificationId(medicationId, time) {
  const str = `${medicationId}::${time}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  // Ensure positive integer
  return Math.abs(hash) % 2_000_000_000;
}

// Build the Date object for the next occurrence of a HH:MM time.
function nextOccurrence(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  // If the time has already passed today, schedule for tomorrow
  if (date <= new Date()) date.setDate(date.getDate() + 1);
  return date;
}

// Request notification permission from the OS.
// Call this once on app start (or when the user enables notifications in Settings).
// Returns true if granted, false if denied.
export async function requestNotificationPermission() {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

// Check current permission status without prompting.
export async function hasNotificationPermission() {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedule daily reminder notifications for a single medication.
 * Each scheduled time in medication.times gets its own notification.
 *
 * @param {object} medication — entity with { id, name, dosage, times: string[] }
 */
export async function scheduleMedicationNotifications(medication) {
  if (!medication?.times?.length) return;

  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  const notifications = medication.times.map(time => ({
    id:           notificationId(medication.id, time),
    title:        '💊 Medication Reminder',
    body:         `Time to take ${medication.name}${medication.dosage ? ` — ${medication.dosage}` : ''}`,
    actionTypeId: 'MEDICATION_ACTIONS',
    schedule: {
      at:      nextOccurrence(time),
      repeats: true,
      every:   'day',
    },
    smallIcon: 'ic_notification',
    channelId: 'medication-reminders',
    extra: {
      medicationId:  medication.id,
      scheduledTime: time,
    },
  }));

  try {
    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.warn('Failed to schedule notifications:', e);
  }
}

/**
 * Cancel all notifications for a specific medication.
 * Call this when a medication is deleted or deactivated.
 *
 * @param {object} medication — entity with { id, times: string[] }
 */
export async function cancelMedicationNotifications(medication) {
  if (!medication?.times?.length) return;

  const notifications = medication.times.map(time => ({
    id: notificationId(medication.id, time),
  }));

  try {
    await LocalNotifications.cancel({ notifications });
  } catch (e) {
    console.warn('Failed to cancel notifications:', e);
  }
}

/**
 * Reschedule notifications when a medication is edited.
 * Cancels old notifications (using old times) then schedules new ones.
 *
 * @param {object} oldMedication — medication before edit
 * @param {object} newMedication — medication after edit
 */
export async function rescheduleMedicationNotifications(oldMedication, newMedication) {
  await cancelMedicationNotifications(oldMedication);
  await scheduleMedicationNotifications(newMedication);
}

/**
 * Schedule notifications for all active medications at once.
 * Call this on app start to ensure notifications are set up even if
 * the app was reinstalled or notifications were cleared by the OS.
 *
 * @param {object[]} medications — array of active medication entities
 */
export async function scheduleAllMedicationNotifications(medications) {
  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  // Cancel everything first to avoid duplicates
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch {}

  for (const med of medications) {
    if (med.active !== false) {
      await scheduleMedicationNotifications(med);
    }
  }
}

// Maps frequency string → average doses per day (used for "days remaining" calculation).
function dosesPerDay(frequency) {
  return { daily: 1, twice_daily: 2, three_times_daily: 3, four_times_daily: 4,
           every_6_hours: 4, every_8_hours: 3, every_12_hours: 2, weekly: 1/7 }[frequency] ?? 1;
}

/**
 * Fire a "low stock" notification if quantity_remaining is at or below
 * the medication's refill_reminder_days threshold.
 * Safe to call after every dose log — does nothing if still well-stocked.
 *
 * @param {object} medication — entity with current quantity_remaining already decremented
 */
export async function checkAndNotifyLowStock(medication) {
  if (medication?.quantity_remaining == null) return;

  const dpd = dosesPerDay(medication.frequency);
  const daysLeft = medication.quantity_remaining / dpd;
  const threshold = medication.refill_reminder_days ?? 7;

  if (daysLeft > threshold) return;

  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) return;

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id:    notificationId(medication.id, 'refill'),
        title: '⚠️ Refill Reminder',
        body:  `${medication.name} is running low — ${medication.quantity_remaining} doses left (≈${Math.floor(daysLeft)} days). Request a refill soon.`,
        schedule:  { at: new Date(Date.now() + 3000) },
        channelId: 'medication-reminders',
        extra: { type: 'refill', medicationId: medication.id },
      }]
    });
  } catch {}
}

// Register the "Mark Taken" action button shown on medication reminder notifications.
// Must be called once at startup before any notifications are scheduled.
export async function registerNotificationActions() {
  try {
    await LocalNotifications.registerActionTypes({
      types: [{
        id: 'MEDICATION_ACTIONS',
        actions: [{ id: 'TAKEN', title: 'Mark Taken', foreground: false }],
      }],
    });
  } catch {}
}

// Create the notification channel on Android (required for Android 8+).
// Call once at app startup.
export async function createNotificationChannel() {
  try {
    await LocalNotifications.createChannel({
      id:          'medication-reminders',
      name:        'Medication Reminders',
      description: 'Daily reminders to take your medications',
      importance:  5, // IMPORTANCE_HIGH — shows as heads-up notification
      visibility:  1, // VISIBILITY_PUBLIC
      sound:       'default',
      vibration:   true,
      lights:      true,
      lightColor:  '#FF6B00', // Axis orange
    });
  } catch {}
}
