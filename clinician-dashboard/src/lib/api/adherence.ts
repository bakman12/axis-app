// api/adherence.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure data-fetching for patient_adherence_snapshots.
// Audit entries for reads are written here (DB triggers cover writes).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabaseClient';
import { writeAuditEntry } from './audit';
import type { Tables } from '../supabaseClient';

export type AdherenceSnapshot = Tables<'patient_adherence_snapshots'>;

export interface AdherenceRange {
  snapshots: AdherenceSnapshot[];
  /** Calendar days in range with no data (patient app wasn't synced) */
  missingDates: string[];
  /** Overall adherence rate across the full range */
  overallRate: number | null;
}

/**
 * Fetch daily adherence snapshots for one patient over a date range.
 * Automatically writes an ADHERENCE_READ audit entry.
 */
export async function fetchAdherenceRange(
  patientId: string,
  fromDate: string,   // YYYY-MM-DD
  toDate: string      // YYYY-MM-DD
): Promise<AdherenceRange> {
  const { data, error } = await supabase
    .from('patient_adherence_snapshots')
    .select('*')
    .eq('patient_id', patientId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });

  if (error) throw new Error(`fetchAdherenceRange: ${error.message}`);

  const snapshots = data ?? [];

  // Find dates with no snapshot (gaps in sync)
  const snapshotDates = new Set(snapshots.map(s => s.date));
  const missingDates: string[] = [];
  const cursor = new Date(fromDate);
  const end = new Date(toDate);
  while (cursor <= end) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (!snapshotDates.has(dateStr)) missingDates.push(dateStr);
    cursor.setDate(cursor.getDate() + 1);
  }

  const rates = snapshots
    .map(s => s.adherence_rate)
    .filter((r): r is number => r !== null);

  const overallRate = rates.length
    ? rates.reduce((a, b) => a + b, 0) / rates.length
    : null;

  // Write READ audit entry — the DB trigger only covers INSERT/UPDATE on the table,
  // not SELECT, so we handle SELECT auditing here in the API layer.
  await writeAuditEntry({
    action: 'ADHERENCE_READ',
    patient_id: patientId,
    resource_table: 'patient_adherence_snapshots',
    metadata: { from_date: fromDate, to_date: toDate, rows_returned: snapshots.length },
  });

  return { snapshots, missingDates, overallRate };
}

/**
 * Fetch the last 30 days of adherence for all patients in the org.
 * Used by the Dashboard overview page for the "at-risk patients" panel.
 * Writes a single ADHERENCE_READ audit entry for the batch query.
 */
export async function fetchOrgAdherenceSummary(): Promise<{
  patientId: string;
  avgRate7d: number | null;
  avgRate30d: number | null;
  isAtRisk: boolean;
}[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('patient_adherence_snapshots')
    .select('patient_id, date, adherence_rate')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) throw new Error(`fetchOrgAdherenceSummary: ${error.message}`);

  // Group by patient
  const byPatient = new Map<string, number[]>();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const by7d = new Map<string, number[]>();

  for (const row of data ?? []) {
    if (row.adherence_rate === null) continue;
    const list30 = byPatient.get(row.patient_id) ?? [];
    list30.push(row.adherence_rate);
    byPatient.set(row.patient_id, list30);

    if (row.date >= sevenDaysAgo.toISOString().split('T')[0]) {
      const list7 = by7d.get(row.patient_id) ?? [];
      list7.push(row.adherence_rate);
      by7d.set(row.patient_id, list7);
    }
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const result = Array.from(byPatient.entries()).map(([patientId, rates]) => {
    const avgRate30d = avg(rates);
    const avgRate7d = avg(by7d.get(patientId) ?? []);
    return {
      patientId,
      avgRate30d,
      avgRate7d,
      // At risk = 7-day average below 70%
      isAtRisk: avgRate7d !== null && avgRate7d < 0.7,
    };
  });

  await writeAuditEntry({
    action: 'ADHERENCE_READ',
    resource_table: 'patient_adherence_snapshots',
    metadata: { query: 'org_summary_30d', patient_count: result.length },
  });

  return result;
}
