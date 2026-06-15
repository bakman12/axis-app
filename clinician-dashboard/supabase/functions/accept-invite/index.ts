// accept-invite/index.ts
// Called by the patient's Axis app when they enter an invite code and consent
// to sharing their adherence data.
//
// What it does:
//   1. Validates the invite code is real, not expired, and not already accepted
//   2. Sets consent_granted_at on the patient row
//   3. Replaces the pending axis_user_id_hash with the real hash
//   4. Returns a patient_secret used to HMAC-sign future sync payloads
//
// Auth: No JWT required — the invite code is the credential.
//       Rate-limited by Cloudflare (set 5 req/min on this path).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BodySchema = z.object({
  invite_code:        z.string().length(6),
  // SHA-256 hex of (base44_user_id + invite_code) — derived in clinicSync.js
  axis_user_id_hash:  z.string().regex(/^[a-f0-9]{64}$/),
  // Patient-supplied display name (can be pseudonymous)
  display_name:       z.string().min(1).max(100).optional(),
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { invite_code, axis_user_id_hash, display_name } = parsed.data;

    // Generate the per-patient HMAC secret BEFORE entering the RPC, so we
    // can pass it as a parameter. Random 256 bits → hex.
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const randomHex   = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const secretInput = new TextEncoder().encode(randomHex + axis_user_id_hash);
    const secretHash  = await crypto.subtle.digest('SHA-256', secretInput);
    const patientSecret = Array.from(new Uint8Array(secretHash))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Call the atomic RPC. Either patient + secret + audit all commit, or none do.
    // No half-state where the patient is consented but missing a secret is possible.
    const { data: rpcResult, error: rpcErr } = await admin.rpc('accept_invite_atomic', {
      p_invite_code:       invite_code,
      p_axis_user_id_hash: axis_user_id_hash,
      p_display_name:      display_name ?? null,
      p_secret_hex:        patientSecret,
    });

    if (rpcErr) {
      // Translate Postgres error codes from the RPC into HTTP responses.
      const code = rpcErr.code; // SQLSTATE
      const message = rpcErr.message || '';

      if (message.includes('INVITE_NOT_FOUND'))     return Response.json({ error: 'Invalid or expired invite code' }, { status: 404 });
      if (message.includes('INVITE_EXPIRED'))       return Response.json({ error: 'This invite code has expired. Ask your clinician for a new one.' }, { status: 410 });
      if (message.includes('INVITE_REVOKED'))       return Response.json({ error: 'This sharing arrangement has been revoked.' }, { status: 403 });
      if (message.includes('INVITE_ALREADY_USED'))  return Response.json({ error: 'This invite code has already been used.' }, { status: 409 });

      console.error('accept-invite RPC error:', rpcErr);
      return Response.json({ error: 'Failed to activate consent' }, { status: 500 });
    }

    // RPC returns a single row: { patient_id, org_id }
    const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    if (!row) {
      return Response.json({ error: 'Activation succeeded but no record returned' }, { status: 500 });
    }

    return Response.json({
      ok:             true,
      patient_id:     row.patient_id,
      org_id:         row.org_id,
      // The patient app stores this encrypted in localStorage and sends it
      // as the HMAC key for every future sync call.
      patient_secret: patientSecret,
    });

  } catch (err) {
    console.error('accept-invite error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
