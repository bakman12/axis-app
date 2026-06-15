// AuditLogTable.tsx
// Read-only audit log viewer — admin role only.
// Receives entries as props — never fetches directly.

import { format, parseISO } from 'date-fns';
import type { Tables } from '../lib/supabaseClient';

type AuditEntry = Tables<'clinical_audit_log'>;

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN:                    { label: 'Login',            color: '#5fa87a' },
  MFA_ENROLLED:             { label: 'MFA Enrolled',     color: '#5fa87a' },
  PATIENT_INVITED:          { label: 'Patient Invited',  color: '#6b8cba' },
  PATIENT_CONSENT_GRANTED:  { label: 'Consent Granted',  color: '#5fa87a' },
  PATIENT_CONSENT_REVOKED:  { label: 'Consent Revoked',  color: '#c75b3a' },
  ADHERENCE_READ:           { label: 'Data Read',        color: '#8a8a8a' },
  ADHERENCE_WRITTEN:        { label: 'Data Synced',      color: '#8a8a8a' },
  ADHERENCE_EXPORT:         { label: 'CSV Export',       color: '#c9a96e' },
  PATIENT_READ:             { label: 'Profile Read',     color: '#8a8a8a' },
  CLINICIAN_CREATED:        { label: 'Clinician Added',  color: '#6b8cba' },
  CLINICIAN_DEACTIVATED:    { label: 'Clinician Removed', color: '#c75b3a' },
  SETTINGS_CHANGED:         { label: 'Settings Changed', color: '#c9a96e' },
};

interface Props {
  entries: AuditEntry[];
  isLoading: boolean;
}

export function AuditLogTable({ entries, isLoading }: Props) {
  if (isLoading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#8a8a8a', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem' }}>
        Loading audit log…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#8a8a8a', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem' }}>
        No audit entries yet.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(44,44,44,0.1)' }}>
            {['Timestamp', 'Clinician', 'Action', 'Patient', 'IP Address'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#8a8a8a', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => {
            const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: '#8a8a8a' };
            return (
              <tr key={entry.id} style={{ borderBottom: '1px solid rgba(44,44,44,0.06)' }}>
                <td style={{ padding: '10px 14px', color: '#2c2c2c', whiteSpace: 'nowrap' }}>
                  {format(parseISO(entry.created_at), 'dd MMM yyyy, HH:mm:ss')}
                </td>
                <td style={{ padding: '10px 14px', color: '#2c2c2c' }}>
                  {entry.clinician_email ?? '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 100,
                    background: `${meta.color}18`,
                    color: meta.color,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                  }}>
                    {meta.label}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: '#8a8a8a' }}>
                  {entry.patient_id ? entry.patient_id.slice(0, 8) + '…' : '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#8a8a8a', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {entry.ip_address ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
