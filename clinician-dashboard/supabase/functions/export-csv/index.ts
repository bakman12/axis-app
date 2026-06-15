// export-csv/index.ts
// Admin-only: export adherence data for all org patients as CSV.
// Writes an ADHERENCE_EXPORT audit entry before returning data.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userClient  = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: clinician } = await userClient
    .from('clinicians')
    .select('id, org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!clinician || clinician.role !== 'admin') {
    return Response.json({ error: 'Admin role required for CSV export' }, { status: 403 });
  }

  const url       = new URL(req.url);
  const fromDate  = url.searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const toDate    = url.searchParams.get('to')   ?? new Date().toISOString().split('T')[0];

  // Fetch all snapshots for the org within the date range
  const { data: snapshots, error } = await userClient
    .from('patient_adherence_snapshots')
    .select('*, patient:patients(display_name)')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Build CSV
  const header = 'patient_name,date,doses_scheduled,doses_taken,doses_missed,adherence_rate,streak_days\n';
  const rows = (snapshots ?? []).map(s => {
    const name = (s.patient as { display_name: string } | null)?.display_name ?? 'Unknown';
    return [
      `"${name.replace(/"/g, '""')}"`,
      s.date,
      s.total_doses_scheduled,
      s.total_doses_taken,
      s.total_doses_missed,
      s.adherence_rate !== null ? (s.adherence_rate * 100).toFixed(1) + '%' : '',
      s.streak_days,
    ].join(',');
  }).join('\n');

  const csv = header + rows;

  // Audit the export
  await adminClient.from('clinical_audit_log').insert({
    clinician_id:   clinician.id,
    clinician_email: user.email,
    org_id:          clinician.org_id,
    action:          'ADHERENCE_EXPORT',
    resource_table:  'patient_adherence_snapshots',
    ip_address:      req.headers.get('x-forwarded-for'),
    user_agent:      req.headers.get('user-agent'),
    metadata:        { from_date: fromDate, to_date: toDate, row_count: snapshots?.length ?? 0 },
  });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="axis-adherence-${fromDate}-${toDate}.csv"`,
    },
  });
});
