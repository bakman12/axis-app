// PatientList.tsx
// Paginated table of all consented patients in the org.
// Includes invite flow and at-risk badges.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatients, useInvitePatient } from '../hooks/usePatients';
import { useOrgAdherenceSummary } from '../hooks/useAdherence';

const sans  = { fontFamily: 'Inter, sans-serif' } as const;
const serif = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

export default function PatientList() {
  const navigate = useNavigate();
  const { data: patients = [], isLoading } = usePatients();
  const { data: summaries = [] }           = useOrgAdherenceSummary();
  const inviteMutation                     = useInvitePatient();

  const [showInvite, setShowInvite]   = useState(false);
  const [newName, setNewName]         = useState('');
  const [inviteResult, setInviteResult] = useState<{ code: string; name: string } | null>(null);

  const summaryMap = new Map(summaries.map(s => [s.patientId, s]));

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const result = await inviteMutation.mutateAsync(newName);
    setInviteResult({ code: result.inviteCode, name: newName });
    setNewName('');
    setShowInvite(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f6' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ ...sans, fontSize: '0.82rem', color: '#c75b3a', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, padding: 0 }}>
              ← Dashboard
            </button>
            <h1 style={{ ...serif, fontSize: '2rem', fontWeight: 600, color: '#2c2c2c' }}>Patients</h1>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            style={{ ...sans, padding: '12px 24px', background: '#c75b3a', color: '#faf9f6', border: 'none', borderRadius: 100, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            + Invite Patient
          </button>
        </div>

        {/* Invite success banner */}
        {inviteResult && (
          <div style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(95,168,122,0.08)', border: '1px solid rgba(95,168,122,0.25)', borderRadius: 12 }}>
            <p style={{ ...sans, fontSize: '0.85rem', fontWeight: 600, color: '#2c7a4b', marginBottom: 4 }}>
              Invite created for {inviteResult.name}
            </p>
            <p style={{ ...sans, fontSize: '0.82rem', color: '#8a8a8a' }}>
              Share this code with the patient: <code style={{ ...sans, fontWeight: 700, fontSize: '1rem', color: '#2c2c2c', letterSpacing: '0.15em' }}>{inviteResult.code}</code>
            </p>
            <p style={{ ...sans, fontSize: '0.75rem', color: '#8a8a8a', marginTop: 4 }}>
              Patient enters this code in the Axis app under Settings → Share with Clinic. Expires in 7 days.
            </p>
            <button onClick={() => setInviteResult(null)} style={{ ...sans, fontSize: '0.75rem', color: '#8a8a8a', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0 }}>Dismiss</button>
          </div>
        )}

        {/* Patient table */}
        <div style={{ background: '#fff', border: '1px solid rgba(44,44,44,0.1)', borderRadius: 16, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', ...sans, color: '#8a8a8a', fontSize: '0.85rem' }}>Loading patients…</div>
          ) : patients.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <p style={{ ...serif, fontSize: '1.2rem', color: '#2c2c2c', opacity: 0.4, marginBottom: 8 }}>No patients yet</p>
              <p style={{ ...sans, fontSize: '0.82rem', color: '#8a8a8a' }}>Invite a patient to get started</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}>
                  {['Patient', 'Adherence (30d)', 'Adherence (7d)', 'Status', ''].map(h => (
                    <th key={h} style={{ ...sans, padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#8a8a8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map(patient => {
                  const summary = summaryMap.get(patient.id);
                  const r30 = summary?.avgRate30d;
                  const r7  = summary?.avgRate7d;
                  const atRisk = r7 !== null && r7 !== undefined && r7 < 0.7;

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      style={{ borderBottom: '1px solid rgba(44,44,44,0.06)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#faf9f6'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <p style={{ ...sans, fontWeight: 600, color: '#2c2c2c', fontSize: '0.88rem' }}>{patient.display_name}</p>
                        <p style={{ ...sans, fontSize: '0.72rem', color: '#8a8a8a', marginTop: 2 }}>
                          Consented {patient.consent_granted_at ? new Date(patient.consent_granted_at).toLocaleDateString('en-GB') : '—'}
                        </p>
                      </td>
                      <td style={{ padding: '16px 20px', ...sans, fontSize: '0.88rem', color: '#2c2c2c' }}>
                        {r30 !== null && r30 !== undefined ? `${Math.round(r30 * 100)}%` : '—'}
                      </td>
                      <td style={{ padding: '16px 20px', ...sans, fontSize: '0.88rem', color: atRisk ? '#c75b3a' : '#2c2c2c', fontWeight: atRisk ? 600 : 400 }}>
                        {r7 !== null && r7 !== undefined ? `${Math.round(r7 * 100)}%` : '—'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          ...sans,
                          display: 'inline-block',
                          padding: '3px 12px',
                          borderRadius: 100,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: atRisk ? 'rgba(199,91,58,0.08)' : 'rgba(95,168,122,0.08)',
                          color: atRisk ? '#c75b3a' : '#2c7a4b',
                          border: `1px solid ${atRisk ? 'rgba(199,91,58,0.2)' : 'rgba(95,168,122,0.2)'}`,
                        }}>
                          {atRisk ? 'At risk' : 'On track'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#8a8a8a', textAlign: 'right', fontSize: '0.82rem' }}>View →</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Inline invite modal */}
        {showInvite && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,44,44,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: '40px', width: '100%', maxWidth: 420, boxShadow: '0 8px 48px rgba(44,44,44,0.15)' }}>
              <h2 style={{ ...serif, fontSize: '1.4rem', fontWeight: 600, color: '#2c2c2c', marginBottom: 8 }}>Invite a patient</h2>
              <p style={{ ...sans, fontSize: '0.82rem', color: '#8a8a8a', marginBottom: 24 }}>
                A 6-character invite code will be generated. Share it with the patient — they enter it in the Axis app to start sharing their adherence data.
              </p>
              <form onSubmit={handleInvite}>
                <label style={{ ...sans, fontSize: '0.82rem', fontWeight: 500, color: '#2c2c2c', display: 'block', marginBottom: 8 }}>
                  Patient display name
                </label>
                <input
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Patient A, John S., etc."
                  style={{ ...sans, width: '100%', padding: '12px 14px', border: '1px solid rgba(44,44,44,0.15)', borderRadius: 10, fontSize: '0.9rem', color: '#2c2c2c', background: '#faf9f6', outline: 'none', marginBottom: 20 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setShowInvite(false)} style={{ ...sans, flex: 1, padding: '12px', border: '1px solid rgba(44,44,44,0.15)', borderRadius: 100, fontSize: '0.85rem', color: '#8a8a8a', background: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={inviteMutation.isPending} style={{ ...sans, flex: 1, padding: '12px', background: '#c75b3a', color: '#faf9f6', border: 'none', borderRadius: 100, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    {inviteMutation.isPending ? 'Creating…' : 'Create Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
