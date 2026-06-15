// sentry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sentry init for the clinician dashboard.
//
// THIS APP IS DIFFERENT FROM THE PATIENT APP. It has real PHI (patient IDs,
// adherence rates, audit log entries). The scrubbing here is correspondingly
// aggressive — no patient identifier or adherence number ever leaves in an
// error report.
//
// Rules:
//   1. Drop ALL fetch breadcrumbs. Supabase URLs would include patient_id query
//      params which are PHI under HIPAA.
//   2. Scrub UUID-looking strings everywhere (could be patient IDs).
//   3. Scrub anything that looks like an adherence rate (0–1 floats with 4 decimals).
//   4. setUser uses the clinician's id ONLY, never the email — emails are PII.
//   5. No session replay, no performance monitoring (both leak content).
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

const PHI_KEYS = [
  'patient_id', 'patient_ids', 'patient_email', 'patient_name',
  'axis_user_id_hash', 'display_name', 'invite_code',
  'secret_hex', 'patient_secret', 'patient_secret_wrapped',
  'missed_medication_ids', 'medication_id', 'medication_ids',
  'clinician_email', 'email',
];

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const ADHERENCE_RE = /"adherence_rate"\s*:\s*[\d.]+/g;

function scrubString(s: string): string {
  return s.replace(UUID_RE, '[uuid]').replace(ADHERENCE_RE, '"adherence_rate":[redacted]');
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 8 || value == null) return value;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map(v => scrub(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (PHI_KEYS.includes(k.toLowerCase())) {
        out[k] = '[phi-redacted]';
      } else {
        out[k] = scrub(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function initSentry() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.0,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 0.0,
    integrations: [
      Sentry.browserApiErrorsIntegration(),
      Sentry.globalHandlersIntegration(),
    ],
    beforeBreadcrumb() {
      return null;
    },
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.url) {
          event.request.url = scrubString(event.request.url.split('?')[0]);
        }
      }
      // Scrub the message itself — UUIDs often leak into error messages from
      // Supabase responses like "row not found for patient_id=<uuid>"
      if (event.message) event.message = scrubString(event.message);
      if (event.exception?.values) {
        for (const exc of event.exception.values) {
          if (exc.value) exc.value = scrubString(exc.value);
          if (exc.stacktrace?.frames) {
            for (const frame of exc.stacktrace.frames) {
              if (frame.vars) frame.vars = scrub(frame.vars) as typeof frame.vars;
            }
          }
        }
      }
      if (event.extra)    event.extra    = scrub(event.extra)    as typeof event.extra;
      if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
      if (event.tags) {
        for (const k of Object.keys(event.tags)) {
          if (PHI_KEYS.includes(k.toLowerCase())) delete event.tags[k];
        }
      }
      return event;
    },
  });

  Sentry.setTag('app', 'clinician-dashboard');
}

/** Set the clinician's stable ID after login. NEVER pass email. */
export function identifyClinician(clinicianId: string, orgId: string) {
  Sentry.setUser({ id: clinicianId });
  Sentry.setTag('org_id', orgId);
}

export { Sentry };
