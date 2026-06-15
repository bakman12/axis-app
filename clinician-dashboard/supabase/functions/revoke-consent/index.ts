// revoke-consent/index.ts
// Called by the patient's Axis app to stop sharing adherence data.
// Auth: patient_secret + axis_user_id_hash (same as sync calls).
// After revocation, the sync-adherence function will reject further pushes.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BodySchema = z.object({
  invite_code:       z.string().length(6),
  axis_user_id_hash: z.string().regex(/^[a-f0-9]{64}$/),
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { invite_code, axis_user_id_hash } = parsed.data;

    const { data: patient, error: pErr } = await admin
      .from('patients')
      .select('id, org_id, consent_revoked_at')
      .eq('invite_code', invite_code)
      .eq('axis_user_id_hash', axis_user_id_hash)
      .single();

    if (pErr || !patient) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (patient.consent_revoked_at) {
      // Already revoked — idempotent, return success
      return Response.json({ ok: true, already_revoked: true });
    }

    await admin
      .from('patients')
      .update({ consent_revoked_at: new Date().toISOString() })
      .eq('id', patient.id);

    await admin.from('clinical_audit_log').insert({
      org_id:         patient.org_id,
      patient_id:     patient.id,
      action:         'PATIENT_CONSENT_REVOKED',
      resource_table: 'patients',
      resource_id:    patient.id,
      ip_address:     req.headers.get('x-forwarded-for'),
      user_agent:     req.headers.get('user-agent'),
    });

    return Response.json({ ok: true });

  } catch (err) {
    console.error('revoke-consent error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
