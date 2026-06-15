// clinicSync.js
// ─────────────────────────────────────────────────────────────────────────────
// Patient-side integration with the Axis Clinician Dashboard.
//
// Responsibilities:
//   1. Accept-invite: send consent to the backend, store credentials locally
//   2. Daily sync:    push today's adherence snapshot (fire-and-forget)
//   3. Revoke:        tell the backend to stop accepting pushes
//
// STORAGE:
//   Consent metadata (invite_code, axis_user_id_hash, patient_id, org_id) lives
//   in plain localStorage — these are not secrets in themselves.
//   The patient_secret (HMAC key) is AES-256-GCM encrypted with the user's
//   master key before being written, so an attacker reading localStorage cannot
//   forge sync payloads without also unlocking the app.
//
// Privacy note: we NEVER send medication names to the clinician backend.
// Only aggregated counts (taken/missed/scheduled) and streak days.
// ─────────────────────────────────────────────────────────────────────────────

import { getCurrentKey } from './cryptoStore';

const CONSENT_KEY      = 'axis_clinic_consent';
const LAST_SYNC_KEY    = 'axis_clinic_last_sync';
const SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000; // sync at most once every 6 hours

// Supabase project URL — where the Edge Functions live
const SUPABASE_URL = import.meta.env.VITE_CLINIC_SUPABASE_URL ?? '';

// ─── Crypto helpers ───────────────────────────────────────────────────────────

/** SHA-256 hex digest of a string */
async function sha256(str) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * HMAC-SHA256 of a message using a hex key string.
 * Used to sign sync payloads so the backend can verify they came from this patient.
 */
async function hmacSha256(keyHex, message) {
  const keyBytes = Uint8Array.from(
    keyHex.match(/.{2}/g).map(b => parseInt(b, 16))
  );
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Secret wrapping with the user's AES master key ──────────────────────────
// Encrypts the patient_secret before it touches localStorage. If the app is
// locked (no master key in RAM), wrap/unwrap fail-closed — sync simply skips
// until the user unlocks. This guarantees the HMAC key is only readable while
// the user is authenticated.

async function wrapSecret(plaintextSecret) {
  const masterKey = getCurrentKey();
  if (!masterKey) return null;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ct = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    new TextEncoder().encode(plaintextSecret),
  );
  return {
    ct: btoa(String.fromCharCode(...new Uint8Array(ct))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function unwrapSecret(envelope) {
  if (!envelope?.ct || !envelope?.iv) return null;
  const masterKey = getCurrentKey();
  if (!masterKey) return null;
  try {
    const ct = Uint8Array.from(atob(envelope.ct), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(envelope.iv), c => c.charCodeAt(0));
    const plain = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      ct,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// ─── Consent state ────────────────────────────────────────────────────────────

/** Returns the stored consent object, or null if not consented. */
export function getConsentState() {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
  } catch {
    return null;
  }
}

/** True if the patient has active (non-revoked) consent. */
export function isConsentActive() {
  const s = getConsentState();
  return !!s && !s.revoked_at;
}

function saveConsent(state) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
}

function clearConsent() {
  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

// ─── Accept invite ─────────────────────────────────────────────────────────────

/**
 * Accept a clinician's invite code. Registers consent with the backend and
 * stores the credentials needed for future sync calls.
 *
 * @param {string} inviteCode   — 6-char code from the clinician
 * @param {string} axisUserId   — the patient's Base44 user ID (from base44.auth.me())
 * @param {string} displayName  — patient-chosen name (can be pseudonymous)
 * @returns {{ ok: boolean, error?: string }}
 */
export async function acceptInvite(inviteCode, axisUserId, displayName) {
  if (!SUPABASE_URL) return { ok: false, error: 'Clinic sync not configured' };
  if (isConsentActive()) return { ok: false, error: 'Already sharing with a clinic' };

  const code = inviteCode.trim().toUpperCase();
  if (code.length !== 6) return { ok: false, error: 'Invite code must be 6 characters' };

  // Pre-flight: confirm the master key is available BEFORE talking to the
  // server. If we fetch first and then find the key missing, the server would
  // commit consent + secret while the client throws the secret away — a
  // permanent half-state that requires a clinician to re-issue the invite.
  // Failing fast here means the server is never touched in that race.
  if (!getCurrentKey()) {
    return { ok: false, error: 'App must be unlocked to set up sharing — please retry' };
  }

  // Derive a stable, privacy-safe hash of this patient in this organisation.
  // The hash is deterministic so the backend can correlate daily syncs.
  const axisUserIdHash = await sha256(axisUserId + code);

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/accept-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invite_code:       code,
        axis_user_id_hash: axisUserIdHash,
        display_name:      displayName,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error ?? 'Failed to accept invite' };
    }

    // Wrap the patient_secret with the user's AES master key before storing.
    // We already checked getCurrentKey() above; if the app auto-locked while
    // the fetch was in flight, this returns null and we surface an error —
    // the user can revoke from the dashboard or contact their clinician.
    const wrappedSecret = await wrapSecret(data.patient_secret);
    if (!wrappedSecret) {
      // Tell the server to revoke the consent it just granted, so the patient
      // can retry without a fresh invite from their clinician.
      await fetch(`${SUPABASE_URL}/functions/v1/revoke-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_code:       code,
          axis_user_id_hash: axisUserIdHash,
        }),
      }).catch(() => {}); // best-effort
      return { ok: false, error: 'App locked during setup — please unlock and retry' };
    }

    // Store consent metadata + WRAPPED secret. The metadata fields (invite_code,
    // axis_user_id_hash, patient_id, org_id) are not themselves secrets — they
    // only become useful when combined with the wrapped secret, which is
    // unreadable without the user's master key.
    saveConsent({
      invite_code:           code,
      axis_user_id_hash:     axisUserIdHash,
      patient_id:            data.patient_id,
      org_id:                data.org_id,
      patient_secret_wrapped: wrappedSecret,
      consented_at:          new Date().toISOString(),
      revoked_at:            null,
    });

    return { ok: true };

  } catch (err) {
    console.error('[clinicSync] acceptInvite error:', err);
    return { ok: false, error: 'Network error — please try again' };
  }
}

// ─── Daily sync ───────────────────────────────────────────────────────────────

/**
 * Push today's adherence snapshot to the clinician dashboard.
 * Call this on every app open — the cooldown guard prevents hammering.
 *
 * @param {object[]} medications — active medications from the query cache
 * @param {object[]} todayLogs   — today's dose logs from the query cache
 */
export async function syncTodayAdherence(medications, todayLogs) {
  if (!SUPABASE_URL) return;
  if (!isConsentActive()) return;

  // Cooldown: don't sync more than once every 6 hours
  const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0', 10);
  if (Date.now() - lastSync < SYNC_COOLDOWN_MS) return;

  const consent = getConsentState();
  const today   = new Date().toISOString().split('T')[0];

  // Build aggregated counts — NO medication names leave the device
  const scheduled = medications.flatMap(m => m.times || []);
  const taken      = todayLogs.filter(l => l.status === 'taken');
  const missed     = todayLogs.filter(l => l.status === 'missed');

  // Hashed medication IDs for missed doses (clinician sees count + opaque ID)
  const missedHashedIds = await Promise.all(
    missed.map(l => sha256(l.medication_id + consent.invite_code))
  );

  // Compute current streak from localStorage (mirroring GamificationDashboard logic)
  const streakDays = computeCurrentStreak(todayLogs);

  // Unwrap the HMAC key with the user's master key. Fails closed if the app
  // is locked — sync skips silently until next unlock + open.
  const patientSecret = await unwrapSecret(consent.patient_secret_wrapped);
  if (!patientSecret) return;

  // Build HMAC signature so the backend can verify this payload
  const sigInput = consent.invite_code + today + consent.axis_user_id_hash;
  const signature = await hmacSha256(patientSecret, sigInput);

  const payload = {
    invite_code:           consent.invite_code,
    axis_user_id_hash:     consent.axis_user_id_hash,
    date:                  today,
    total_doses_scheduled: scheduled.length,
    total_doses_taken:     taken.length,
    total_doses_missed:    missed.length,
    missed_medication_ids: missedHashedIds,
    streak_days:           streakDays,
    signature,
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-adherence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    } else {
      const err = await res.json().catch(() => ({}));
      // If the backend says consent was revoked, update local state to match
      if (res.status === 403 && err.error?.includes('revoked')) {
        const s = getConsentState();
        if (s) saveConsent({ ...s, revoked_at: new Date().toISOString() });
      }
      console.warn('[clinicSync] sync failed:', err.error);
    }
  } catch (err) {
    // Fire-and-forget — network errors are silent
    console.warn('[clinicSync] syncTodayAdherence network error:', err);
  }
}

// ─── Revoke ───────────────────────────────────────────────────────────────────

/**
 * Revoke consent. Tells the backend to stop accepting pushes and clears local state.
 * @returns {{ ok: boolean, error?: string }}
 */
export async function revokeConsent() {
  const consent = getConsentState();
  if (!consent) return { ok: true }; // nothing to revoke

  if (!SUPABASE_URL) {
    // Offline — clear locally, will reconcile next time network is available
    clearConsent();
    return { ok: true };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/revoke-consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invite_code:       consent.invite_code,
        axis_user_id_hash: consent.axis_user_id_hash,
      }),
    });

    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? 'Revocation failed' };

    clearConsent();
    return { ok: true };

  } catch (err) {
    console.error('[clinicSync] revokeConsent error:', err);
    // Clear locally even on network error — user intent takes precedence
    clearConsent();
    return { ok: true };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute current streak from today's logs and localStorage history.
 * Simplified version of the GamificationDashboard streak logic.
 */
function computeCurrentStreak(todayLogs) {
  const hasLoggedToday = todayLogs.some(l => l.status === 'taken');
  try {
    const stored = parseInt(localStorage.getItem('axis_streak_count') || '0', 10);
    return hasLoggedToday ? Math.max(stored, 1) : stored;
  } catch {
    return hasLoggedToday ? 1 : 0;
  }
}
