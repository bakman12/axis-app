// PatientDetail.tsx
// Single patient view: profile, 30-day adherence chart, and audit log for this patient.

import { useParams, useNavigate } from 'react-router-dom';
import { usePatientDetail } from '../hooks/usePatients';
import { usePatientAdherence } from '../hooks/useAdherence';
import { useAuditLog } from '../hooks/useAuditLog';
import { useAuth } from '../lib/auth/AuthContext';
import { AdherenceChart } from '../components/AdherenceChart';
import { AuditLogTable } from '../components/AuditLogTable';

const sans  = { fontFamily: 'Inter, sans-serif' } as const;
const serif = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

export default function PatientDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { clinician } = useAuth();

  const { data: patient,   isLoading: pLoad }  = usePatientDetail(id);
  const { data: adherence, isLoading: aLoad }  = usePatientAdherence(id);
  const { data: auditLog,  isLoading: auLoad } = useAuditLog({ patientId: id });

  if (pLoad) {
    return <div style={{ padding: 60, textAlign: 'center', ...sans, color: '#8a8a8a' }}>Loading…</div>;
  }

  if (!patient) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <p style={{ ...serif, fontSize: '1.2rem', color: '#2c2c2c', marginBottom: 8 }}>Patient not found</p>
        <button onClick={() => navigate('/patients')} style={{ ...sans, color: '#c75b3a', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to patients</button>
      </div>
    );
  }

  const overallRate = adherence?.overallRate;

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f6' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px 80px' }}>

        {/* Back */}
        <button onClick={() => navigate('/patients')} style={{ ...sans, fontSize: '0.82rem', color: '#c75b3a', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}>
          ← All Patients
        </button>

        {/* Patient header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(199,91,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c75b3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div>
            <h1 style={{ ...serif, fontSize: '2rem', fontWeight: 600, color: '#2c2c2c', marginBottom: 4 }}>{patient.display_name}</h1>
            <p style={{ ...sans, fontSize: '0.78rem', color: '#8a8a8a' }}>
              Sharing since {patient.consent_granted_at ? new Date(patient.consent_granted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
          {[
            { label: '30-day Adherence', value: overallRate !== null && overallRate !== undefined ? `${Math.round(overallRate * 100)}%` : '—' },
            { label: 'Current Streak',   value: `${patient.current_streak}d` },
            { label: 'Low-adherence days (7d)', value: patient.low_adherence_days_7d },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid rgba(44,44,44,0.1)', borderRadius: 14, padding: '20px 18px' }}>
              <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 10 }}>{label}</p>
              <p style={{ ...serif, fontSize: '2rem', fontWeight: 600, color: '#2c2c2c', lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Adherence chart */}
        <div style={{ background: '#fff', border: '1px solid rgba(44,44,44,0.1)', borderRadius: 16, padding: '28px', marginBottom: 32 }}>
          <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 20 }}>
            30-Day Adherence
          </p>
          {aLoad ? (
            <div style={{ height: 200, background: 'rgba(44,44,44,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', ...sans, color: '#8a8a8a', fontSize: '0.82rem' }}>
              Loading chart…
            </div>
          ) : adherence ? (
            <AdherenceChart snapshots={adherence.snapshots} missingDates={adherence.missingDates} />
          ) : (
            <p style={{ ...sans, color: '#8a8a8a', fontSize: '0.85rem' }}>No adherence data available.</p>
          )}
        </div>

        {/* Audit log (admin only) */}
        {clinician?.role === 'admin' && (
          <div style={{ background: '#fff', border: '1px solid rgba(44,44,44,0.1)', borderRadius: 16, padding: '28px' }}>
            <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 20 }}>
              Access History (this patient)
            </p>
            <AuditLogTable entries={auditLog ?? []} isLoading={auLoad} />
          </div>
        )}

      </div>
    </div>
  );
}
