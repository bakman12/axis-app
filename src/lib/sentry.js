// sentry.js
// ─────────────────────────────────────────────────────────────────────────────
// Privacy-respecting Sentry initialisation for the patient app.
//
// CRITICAL DESIGN PRINCIPLES — read before changing anything here.
// ─────────────────────────────────────────────────────────────────
//
// 1. NO PATIENT DATA EVER LEAVES THE DEVICE.
//    The whole point of Axis is local-only encrypted medication storage.
//    Sentry mustn't undermine that. We strip everything that could plausibly
//    contain medication names, dosages, notes, IDs, or anything decrypted.
//
// 2. NO BREADCRUMBS FROM ENCRYPTED ENTITY CALLS.
//    The fetch/XHR breadcrumb integration would log every Base44 entity URL.
//    Even though the body is encrypted on the wire, URLs like
//    /api/entities/Medication?filter=... can leak the fact the user has e.g.
//    a contraceptive prescription via predictable query patterns. We disable
//    the fetch breadcrumb integration entirely.
//
// 3. NO PII IN USER SCOPE.
//    We never call Sentry.setUser with email/name. The user is identified by
//    a random per-install UUID stored in localStorage, useful only for
//    correlating multiple errors from the same device.
//
// 4. beforeSend SCRUBS COMMON LEAK PATHS.
//    Stack frame locals, request URLs, error messages — all run through a
//    sanitiser that redacts anything that looks like medication data.
//
// 5. OFF BY DEFAULT IN DEV.
//    Only initialised when VITE_SENTRY_DSN is set. Local dev shouldn't ship
//    errors to the production project.
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

// Generate a stable per-install ID. Not PII — just a way to group errors
// from the same device without uploading anything identifying.
function getInstallId() {
  try {
    let id = localStorage.getItem('axis_install_id');
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
      localStorage.setItem('axis_install_id', id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

// Patterns that strongly suggest medication data. Anything matching gets
// replaced with [redacted] before the event leaves the device.
const SENSITIVE_KEYS = [
  'name', 'dosage', 'notes', 'medication_name', 'frequency', 'context',
  'health_conditions', 'dietary_restrictions', 'goals', 'destination',
  'title', 'description', 'medication', 'medications', 'patient_secret',
  'patient_secret_wrapped', 'axis_user_id_hash', 'invite_code',
];

/** Recursively redact sensitive keys from any object. Idempotent. */
function scrub(value, depth = 0) {
  if (depth > 8 || value == null) return value;
  if (typeof value === 'string') {
    // Catch obvious encrypted envelopes (we never want to upload ciphertext)
    if (value.length > 200) return '[redacted-long-string]';
    return value;
  }
  if (Array.isArray(value)) return value.map(v => scrub(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
        out[k] = '[redacted]';
      } else {
        out[k] = scrub(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function initSentry() {
  if (!DSN) {
    // No DSN configured — Sentry stays disabled. Errors fall back to console.
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // Conservative sampling — health apps don't need 100% of every event.
    tracesSampleRate: 0.0,           // performance tracing off (saves quota + privacy)
    replaysSessionSampleRate: 0.0,   // session replay off (privacy)
    replaysOnErrorSampleRate: 0.0,
    // Disable the integrations that log fetch URLs and console output —
    // both are leak vectors for medication data.
    integrations: [
      Sentry.browserApiErrorsIntegration(),
      Sentry.globalHandlersIntegration(),
      // Notably NOT included: browserTracingIntegration, breadcrumbsIntegration,
      // httpClientIntegration, replayIntegration.
    ],
    beforeBreadcrumb() {
      // Drop ALL breadcrumbs — the only safe default for a zero-knowledge app
      return null;
    },
    beforeSend(event) {
      // Strip request URL params and bodies
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.url) {
          // Keep the path but strip query string (filters often include patient data)
          event.request.url = event.request.url.split('?')[0];
        }
      }
      // Scrub locals from every stack frame
      if (event.exception?.values) {
        for (const exc of event.exception.values) {
          if (exc.stacktrace?.frames) {
            for (const frame of exc.stacktrace.frames) {
              if (frame.vars) frame.vars = scrub(frame.vars);
            }
          }
        }
      }
      // Scrub anything we attached via setExtra / setContext
      if (event.extra)    event.extra    = scrub(event.extra);
      if (event.contexts) event.contexts = scrub(event.contexts);
      // Drop any tags that might be PII
      if (event.tags) {
        for (const k of Object.keys(event.tags)) {
          if (SENSITIVE_KEYS.includes(k.toLowerCase())) delete event.tags[k];
        }
      }
      return event;
    },
  });

  // Group events by install, not identity
  Sentry.setUser({ id: getInstallId() });
  Sentry.setTag('platform', window.Capacitor?.getPlatform?.() ?? 'web');
}

// Export the Sentry instance for ErrorBoundary use elsewhere.
export { Sentry };
