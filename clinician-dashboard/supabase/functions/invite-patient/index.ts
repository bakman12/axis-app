// invite-patient/index.ts
// Creates a patient invite and (optionally) sends a consent email.
// Requires a valid clinician JWT. Enforces org seat limits.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Authenticate the clinician using their JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  // Client using the clinician's JWT (RLS-enforced)
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service client for writes that need to bypass RLS (audit log, patient insert)
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Verify the JWT
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Resolve clinician
    const { data: clinician } = await userClient
      .from('clinicians')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!clinician) {
      return Response.json({ error: 'Clinician profile not found' }, { status: 403 });
    }

    if (!['admin', 'clinician'].includes(clinician.role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check seat limit
    const { count } = await userClient
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', clinician.org_id)
      .not('consent_granted_at', 'is', null);

    const { data: org } = await userClient
      .from('organisations')
      .select('max_patients')
      .eq('id', clinician.org_id)
      .single();

    if (count !== null && org && count >= org.max_patients) {
      return Response.json({
        error: `Patient limit reached (${org.max_patients}). Upgrade your plan to add more patients.`,
      }, { status: 402 });
    }

    const body = await req.json();
    const displayName: string = body.display_name?.trim() || 'Unnamed Patient';

    // Generate unique 6-char invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: patient, error: insertErr } = await adminClient
      .from('patients')
      .insert({
        org_id:              clinician.org_id,
        display_name:        displayName,
        invite_code:         inviteCode,
        axis_user_id_hash:   `pending::${inviteCode}`,
        invited_by:          clinician.id,
      })
      .select()
      .single();

    if (insertErr || !patient) {
      console.error('invite-patient insert error:', insertErr);
      return Response.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    // Write audit log entry
    await adminClient.from('clinical_audit_log').insert({
      clinician_id:   clinician.id,
      clinician_email: user.email,
      org_id:          clinician.org_id,
      patient_id:      patient.id,
      action:          'PATIENT_INVITED',
      resource_table:  'patients',
      resource_id:     patient.id,
      ip_address:      req.headers.get('x-forwarded-for'),
      user_agent:      req.headers.get('user-agent'),
      metadata:        { display_name: displayName },
    });

    return Response.json({ invite_code: inviteCode, patient_id: patient.id });

  } catch (err) {
    console.error('invite-patient unexpected error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
