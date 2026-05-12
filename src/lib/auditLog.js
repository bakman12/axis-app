// auditLog.js
// ─────────────────────────────────────────────────────────────────────────────
// Tamper-evident local audit log. Every significant action in the app is
// stamped with a timestamp and stored in localStorage.
//
// WHY:
//   - Users can see exactly what happened to their data and when
//   - B2B buyers (healthcare, legal) require audit trails for compliance
//   - Forms the foundation of the SDK's audit API
//
// FORMAT: Each entry is { id, timestamp, event, details, checksum }
// The checksum is a simple hash of the previous entry's checksum + current
// data — makes it detectable if entries are deleted or modified.
//
// STORAGE: Last 1000 events kept in localStorage under 'axis_audit_log'.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'axis_audit_log';
const MAX_ENTRIES = 1000;

// Simple non-cryptographic hash for chaining entries (tamper detection).
function simpleHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLog(log) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

/**
 * Record an audit event.
 *
 * @param {string} event   — machine-readable event type (e.g. 'medication.added')
 * @param {object} details — any relevant context (medication name, etc.)
 */
export function logAuditEvent(event, details = {}) {
  const log = loadLog();
  const prevChecksum = log[0]?.checksum ?? '00000000';
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ event, details, timestamp });

  const entry = {
    id:        crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    timestamp,
    event,
    details,
    checksum:  simpleHash(prevChecksum + payload),
  };

  // Prepend so most recent is first, trim to max size
  log.unshift(entry);
  saveLog(log.slice(0, MAX_ENTRIES));
}

/** Return all audit log entries, most recent first. */
export function getAuditLog() {
  return loadLog();
}

/** Clear the entire audit log (only callable from Settings). */
export function clearAuditLog() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Verify log integrity — walks the chain and checks every checksum.
 * Returns { valid: boolean, tamperedAt: entry | null }
 */
export function verifyAuditLog() {
  const log = loadLog();
  if (log.length === 0) return { valid: true, tamperedAt: null };

  // Walk from oldest to newest (reverse order in array)
  for (let i = log.length - 1; i >= 0; i--) {
    const entry = log[i];
    const prevChecksum = log[i + 1]?.checksum ?? '00000000';
    const payload = JSON.stringify({
      event: entry.event,
      details: entry.details,
      timestamp: entry.timestamp,
    });
    const expected = simpleHash(prevChecksum + payload);
    if (expected !== entry.checksum) {
      return { valid: false, tamperedAt: entry };
    }
  }
  return { valid: true, tamperedAt: null };
}

// ── Event type constants ──────────────────────────────────────────────────────
// Use these instead of raw strings to keep event names consistent.

export const AUDIT = {
  APP_UNLOCKED:          'app.unlocked',
  APP_LOCKED:            'app.locked',
  MEDICATION_ADDED:      'medication.added',
  MEDICATION_UPDATED:    'medication.updated',
  MEDICATION_DELETED:    'medication.deleted',
  DOSE_LOGGED:           'dose.logged',
  DOSE_SKIPPED:          'dose.skipped',
  DATA_EXPORTED:         'data.exported',
  PIN_CHANGED:           'security.pin_changed',
  BIOMETRIC_ENROLLED:    'security.biometric_enrolled',
  SECURITY_BREACH:       'security.breach_detected',
  EMERGENCY_ID_VIEWED:   'emergency_id.viewed',
};
