// api/audit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Write-only helper for the clinical_audit_log table.
// Reading the audit log (admin only) uses the useAuditLog hook.
// This module is the single place that writes audit entries from client code.
// DB triggers (007_audit_triggers.sql) handle INSERT/UPDATE events automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabaseClient';
import type { AuditAction } from '../database.types';

interface AuditEntryParams {
  action: AuditAction;
  patient_id?: string;
  resource_table?: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write a single audit entry.
 * Silently swallows errors — audit failures must NEVER break the user-facing flow.
 * A failed audit entry is logged to console.error for monitoring.
 */
export async function writeAuditEntry(params: AuditEntryParams): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    // Resolve clinician row
    const { data: clinician } = userId
      ? await supabase.from('clinicians').select('id, org_id').eq('user_id', userId).single()
      : { data: null };

    if (!clinician) {
      // Can't write an audit entry without an org_id — skip silently
      return;
    }

    const { error } = await supabase.from('clinical_audit_log').insert({
      clinician_id:    clinician.id,
      clinician_email: session?.session?.user?.email ?? null,
      org_id:          clinician.org_id,
      patient_id:      params.patient_id ?? null,
      action:          params.action,
      resource_table:  params.resource_table ?? null,
      resource_id:     params.resource_id ?? null,
      metadata:        params.metadata ?? {},
    });

    if (error) {
      console.error('[audit] Failed to write audit entry:', error.message, params);
    }
  } catch (err) {
    console.error('[audit] Unexpected error writing audit entry:', err, params);
  }
}

/**
 * Fetch audit log entries for the current organisation (admin only).
 * RLS enforces admin-only access — non-admins get an empty array.
 */
export async function fetchAuditLog(options: {
  patientId?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
} = {}) {
  let query = supabase
    .from('clinical_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 100)
    .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 100) - 1);

  if (options.patientId) query = query.eq('patient_id', options.patientId);
  if (options.action)    query = query.eq('action', options.action);

  const { data, error } = await query;
  if (error) throw new Error(`fetchAuditLog: ${error.message}`);
  return data ?? [];
}
