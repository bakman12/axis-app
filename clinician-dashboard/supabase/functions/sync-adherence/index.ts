// sync-adherence/index.ts
// Called by the patient's Axis app (daily, on app open).
// Accepts an HMAC-signed adherence payload and upserts patient_adherence_snapshots.
// Uses service-role key — bypasses RLS so it can write to the table.
// Verifies patient consent + HMAC signature before accepting any data.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── HMAC verification ───────────────────────────────────────────────────────

/**
 * Compute the expected HMAC-SHA256 signature for a sync payload.
 * Must mirror the client-side hmacSha256 in src/lib/clinicSync.js exactly.
 *
 * @param secretHex per-patient secret (hex-encoded SHA-256)
 * @param message   invite_code + date + axis_user_id_hash
 */
async function computeSignature(secretHex: string, message: string): Promise<string> {
  const keyBytes = new Uint8Array(
    (secretHex.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)),
  );
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC', cryptoKey, new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string comparison. Prevents timing attacks on the signature
 * check — a naive `===` returns faster when the first bytes differ.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Reasonable upper bounds — no real patient has >100 medications.
// Bounding these prevents a stolen secret from being used to write
// megabyte-scale rows into patient_adherence_snapshots.
const MAX_MISSED_MEDS_PER_DAY = 100;
const MAX_DOSES_PER_DAY       = 200;   // unrealistic ceiling
const MAX_STREAK_DAYS         = 100_000; // ~273 years

// Validation schema for the incoming payload.
// Every field has a tight bound — anything beyond what a real Axis app
// would send is rejected before it reaches the DB.
const PayloadSchema = z.object({
  // The patient's hashed Axis user ID (hex SHA-256 = exactly 64 chars).
  axis_user_id_hash: z.string().regex(/^[a-f0-9]{64}$/, 'must be 64-char hex'),
  // The invite code used during consent (uppercase alphanumeric).
  invite_code:       z.string().regex(/^[A-Z0-9]{6}$/, 'must be 6 uppercase alphanumerics'),
  // ISO date string YYYY-MM-DD.
  date:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Aggregated dose counts.
  total_doses_scheduled: z.number().int().min(0).max(MAX_DOSES_PER_DAY),
  total_doses_taken:     z.number().int().min(0).max(MAX_DOSES_PER_DAY),
  total_doses_missed:    z.number().int().min(0).max(MAX_DOSES_PER_DAY),
  // Hashed medication IDs of missed doses (each is a 64-char SHA-256 hex).
  missed_medication_ids: z
    .array(z.string().regex(/^[a-f0-9]{64}$/))
    .max(MAX_MISSED_MEDS_PER_DAY)
    .default([]),
  // Current streak at time of snapshot.
  streak_days: z.number().int().min(0).max(MAX_STREAK_DAYS),
  // HMAC-SHA256 signature: hex SHA-256 = exactly 64 chars.
  signature: z.string().regex(/^[a-f0-9]{64}$/, 'must be 64-char hex'),
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const parsed = PayloadSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Look up the patient by invite code + hash
    const { data: patient, error: pErr } = await supabase
      .from('patients')
      .select('id, org_id, consent_granted_at, consent_revoked_at, axis_user_id_hash')
      .eq('invite_code', data.invite_code)
      .eq('axis_user_id_hash', data.axis_user_id_hash)
      .single();

    if (pErr || !patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Verify consent is active
    if (!patient.consent_granted_at) {
      return Response.json({ error: 'Patient has not granted consent' }, { status: 403 });
    }
    if (patient.consent_revoked_at) {
      return Response.json({ error: 'Patient consent has been revoked' }, { status: 403 });
    }

    // ── Verify HMAC signature ─────────────────────────────────────────────
    // Fetch the per-patient secret from the locked-down patient_secrets table.
    // This table has no RLS policies for authenticated/anon — only service_role
    // can read it, so an attacker with a stolen clinician JWT cannot reach it.
    const { data: secretRow, error: secretErr } = await supabase
      .from('patient_secrets')
      .select('secret_hex')
      .eq('patient_id', patient.id)
      .single();

    if (secretErr || !secretRow) {
      console.error('sync-adherence: no patient secret found for', patient.id);
      return Response.json({ error: 'Sync credentials not found — please re-accept invite' }, { status: 403 });
    }

    const expectedSig = await computeSignature(
      secretRow.secret_hex,
      data.invite_code + data.date + data.axis_user_id_hash,
    );

    if (!timingSafeEqual(expectedSig, data.signature)) {
      console.warn('sync-adherence: signature mismatch for patient', patient.id);
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Record verification time for monitoring
    await supabase
      .from('patient_secrets')
      .update({ last_used_at: new Date().toISOString() })
      .eq('patient_id', patient.id);

    // ── Upsert the snapshot (one row per patient per day) ─────────────────
    const { error: uErr } = await supabase
      .from('patient_adherence_snapshots')
      .upsert({
        patient_id:            patient.id,
        org_id:                patient.org_id,
        date:                  data.date,
        total_doses_scheduled: data.total_doses_scheduled,
        total_doses_taken:     data.total_doses_taken,
        total_doses_missed:    data.total_doses_missed,
        missed_medication_ids: data.missed_medication_ids,
        streak_days:           data.streak_days,
        synced_at:             new Date().toISOString(),
      }, {
        onConflict: 'patient_id,date',
      });

    if (uErr) {
      console.error('sync-adherence upsert error:', uErr);
      return Response.json({ error: 'Failed to store adherence data' }, { status: 500 });
    }

    return Response.json({ ok: true });

  } catch (err) {
    console.error('sync-adherence unexpected error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
