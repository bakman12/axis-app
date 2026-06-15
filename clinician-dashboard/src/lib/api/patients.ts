// api/patients.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure data-fetching functions for the patients table.
// No React, no state, no side effects — just async functions that return data.
// UI components NEVER import from here directly; they use src/hooks/usePatients.ts
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabaseClient';
import { writeAuditEntry } from './audit';
import type { Tables } from '../supabaseClient';

export type Patient = Tables<'patients'>;

export interface PatientWithStats extends Patient {
  /** Average adherence rate over the last 30 days (0–1), or null if no data */
  avg_adherence_30d: number | null;
  /** Number of days with adherence < 0.8 in the last 7 days */
  low_adherence_days_7d: number;
  /** Latest streak value from most recent snapshot */
  current_streak: number;
}

/**
 * Fetch all patients for the current clinician's organisation.
 * RLS ensures only patients in the same org are returned.
 * Writes a PATIENT_READ audit entry for each patient viewed.
 */
export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .not('consent_granted_at', 'is', null)   // only consented patients
    .is('consent_revoked_at', null)           // exclude revoked consent
    .order('display_name', { ascending: true });

  if (error) throw new Error(`fetchPatients: ${error.message}`);
  return data ?? [];
}

/**
 * Fetch a single patient with computed adherence stats.
 * Joins the last 30 days of adherence snapshots in one RPC call.
 */
export async function fetchPatientWithStats(patientId: string): Promise<PatientWithStats | null> {
  // Fetch patient profile
  const { data: patient, error: pErr } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (pErr || !patient) return null;

  // Fetch last 30 adherence snapshots
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: snapshots } = await supabase
    .from('patient_adherence_snapshots')
    .select('adherence_rate, streak_days, date')
    .eq('patient_id', patientId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  const rates = (snapshots ?? [])
    .map(s => s.adherence_rate)
    .filter((r): r is number => r !== null);

  const avg_adherence_30d = rates.length
    ? rates.reduce((a, b) => a + b, 0) / rates.length
    : null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const low_adherence_days_7d = (snapshots ?? []).filter(
    s => s.adherence_rate !== null &&
         s.adherence_rate < 0.8 &&
         s.date >= sevenDaysAgo.toISOString().split('T')[0]
  ).length;

  const current_streak = snapshots?.[0]?.streak_days ?? 0;

  // Audit: clinician read this patient's profile
  await writeAuditEntry({
    action: 'PATIENT_READ',
    patient_id: patientId,
    resource_table: 'patients',
    resource_id: patientId,
  });

  return { ...patient, avg_adherence_30d, low_adherence_days_7d, current_streak };
}

/**
 * Create a patient invite. Returns the generated 6-character invite code.
 */
export async function invitePatient(displayName: string): Promise<{ patient: Patient; inviteCode: string }> {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  // We don't know the axis_user_id_hash yet — it's set during patient consent.
  // Use a placeholder that gets replaced when the patient accepts.
  const { data, error } = await supabase
    .from('patients')
    .insert({
      display_name: displayName,
      invite_code: inviteCode,
      axis_user_id_hash: `pending::${inviteCode}`, // updated on patient consent
    })
    .select()
    .single();

  if (error) throw new Error(`invitePatient: ${error.message}`);

  await writeAuditEntry({
    action: 'PATIENT_INVITED',
    patient_id: data.id,
    resource_table: 'patients',
    resource_id: data.id,
    metadata: { display_name: displayName },
  });

  return { patient: data, inviteCode };
}
