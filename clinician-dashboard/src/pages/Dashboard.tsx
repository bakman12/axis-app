// Dashboard.tsx
// Org overview: total patients, at-risk alerts, 30-day org adherence.
// Data comes exclusively from hooks — no direct API calls in this file.

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext';
import { usePatients } from '../hooks/usePatients';
import { useOrgAdherenceSummary } from '../hooks/useAdherence';
import { MissedDoseAlert } from '../components/MissedDoseAlert';

const sans  = { fontFamily: 'Inter, sans-serif' } as const;
const serif = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

export default function Dashboard() {
  const { clinician, signOut } = useAuth();
  const { data: patients = [], isLoading: pLoading } = usePatients();
  const { data: summaries = [], isLoading: sLoading } = useOrgAdherenceSummary();
  const navigate = useNavigate();

  // Build at-risk list by joining patients with their summaries
  const atRisk = summaries
    .filter(s => s.isAtRisk)
    .map(s => {
      const patient = patients.find(p => p.id === s.patientId);
      return patient ? { ...s, displayName: patient.display_name } : null;
    })
    .filter(Boolean) as Array<{
      patientId: string; displayName: string;
      avgRate7d: number; avgRate30d: number | null; isAtRisk: boolean;
    }>;

  const consentedCount = patients.filter(p => p.consent_granted_at).length;
  const orgRate = summaries.length
    ? summaries.reduce((a, s) => a + (s.avgRate30d ?? 0), 0) / summaries.length
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f6' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,249,246,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(44,44,44,0.1)', padding: '0 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <span style={{ ...serif, fontSize: '1.4rem', fontWeight: 600, color: '#2c2c2c' }}>Axis<span style={{ color: '#c75b3a' }}>.</span></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <span style={{ ...sans, fontSize: '0.82rem', color: '#8a8a8a' }}>
              {clinician?.full_name ?? clinician?.organisation?.name ?? 'Clinician'}
            </span>
            <button
              onClick={() => signOut()}
              style={{ ...sans, padding: '8px 18px', border: '1px solid rgba(44,44,44,0.15)', borderRadius: 100, fontSize: '0.78rem', fontWeight: 500, color: '#8a8a8a', background: 'none', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c75b3a', marginBottom: 8 }}>
            {clinician?.organisation?.name}
          </p>
          <h1 style={{ ...serif, fontSize: '2.2rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#2c2c2c' }}>
            Overview
          </h1>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Active Patients',     value: consentedCount,                                         suffix: '' },
            { label: 'At Risk (7d)',         value: atRisk.length,                                          suffix: '' },
            { label: 'Org Adherence (30d)',  value: orgRate !== null ? `${Math.round(orgRate * 100)}%` : '—', suffix: '' },
          ].map(({ label, value, suffix }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid rgba(44,44,44,0.1)', borderRadius: 14, padding: '24px 20px' }}>
              <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 12 }}>{label}</p>
              <p style={{ ...serif, fontSize: '2.4rem', fontWeight: 600, color: '#2c2c2c', lineHeight: 1 }}>{value}{suffix}</p>
            </div>
          ))}
        </div>

        {/* At-risk alerts */}
        {atRisk.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 14 }}>
              Patients needing attention
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {atRisk.map(p => (
                <MissedDoseAlert
                  key={p.patientId}
                  displayName={p.displayName}
                  patientId={p.patientId}
                  avgRate7d={p.avgRate7d!}
                  missedDays={Math.round((1 - (p.avgRate7d ?? 0)) * 7)}
                  onView={id => navigate(`/patients/${id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Navigation tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <NavTile
            title="Patient List"
            description={`${consentedCount} consented patient${consentedCount !== 1 ? 's' : ''}`}
            onClick={() => navigate('/patients')}
          />
          {clinician?.role === 'admin' && (
            <NavTile
              title="Audit Log"
              description="View all data access events"
              onClick={() => navigate('/audit')}
            />
          )}
        </div>

      </main>
    </div>
  );
}

function NavTile({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid rgba(44,44,44,0.1)',
        borderRadius: 14,
        padding: '28px 24px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.2s',
        fontFamily: 'Inter, sans-serif',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(44,44,44,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
    >
      <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.1rem', fontWeight: 600, color: '#2c2c2c', marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: '0.82rem', color: '#8a8a8a' }}>{description}</p>
    </button>
  );
}
