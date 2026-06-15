// ClinicShare.jsx
// Patient-facing "Share with Clinic" screen.
//
// States:
//   idle          → no consent yet, invite code entry form
//   review        → patient sees exactly what will be shared before confirming
//   submitting    → waiting for accept-invite Edge Function
//   active        → consent active, showing sharing status + revoke option
//   revoking      → waiting for revoke-consent Edge Function
//   revoked       → just revoked, confirmation shown
//   error         → something went wrong
//
// Accessed from: Settings → "Share with Clinic"

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/lib/encryptedBase44Client';
import { base44 } from '@/api/base44Client';
import {
  acceptInvite,
  revokeConsent,
  getConsentState,
  isConsentActive,
} from '@/lib/clinicSync';
import RootPageHeader from '../components/RootPageHeader';
import { Shield, Share2, X, CheckCircle, Lock, Activity } from 'lucide-react';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const sans  = { fontFamily: 'Inter, sans-serif' };

const card = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 14,
};

// What is and isn't shared — displayed to patient before they consent
const SHARED = [
  'Total doses taken per day (count only)',
  'Total doses missed per day (count only)',
  'Your current streak',
  'Daily adherence rate (e.g. "3 of 4 doses taken")',
];
const NOT_SHARED = [
  'Medication names or drug types',
  'Dosage amounts',
  'Notes or personal health data',
  'Your name or contact details (unless you choose to enter them)',
  'Location or device information',
];

export default function ClinicShare() {
  const existingConsent                   = getConsentState();
  const initialState                      = isConsentActive() ? 'active' : 'idle';

  const [step, setStep]                   = useState(initialState);
  const [inviteCode, setInviteCode]       = useState('');
  const [displayName, setDisplayName]     = useState('');
  const [error, setError]                 = useState(null);
  const [consent, setConsent]             = useState(existingConsent);

  // Fetch user and medication count for the review screen
  const { data: user }         = useQuery({ queryKey: ['currentUser'],  queryFn: () => base44.auth.me() });
  const { data: medications = [] } = useQuery({ queryKey: ['medications'], queryFn: () => entities.Medication.filter({ active: true }) });

  // ── Step: enter code ───────────────────────────────────────────────────────
  function handleCodeInput(e) {
    const val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    setInviteCode(val);
  }

  function handleCodeSubmit(e) {
    e.preventDefault();
    if (inviteCode.length !== 6) return;
    setError(null);
    setStep('review');
  }

  // ── Step: confirm ──────────────────────────────────────────────────────────
  async function handleConfirm() {
    setStep('submitting');
    setError(null);

    const userId = user?.id ?? user?.email ?? 'anonymous';
    const name   = displayName.trim() || 'Anonymous Patient';

    const result = await acceptInvite(inviteCode, userId, name);

    if (result.ok) {
      setConsent(getConsentState());
      setStep('active');
    } else {
      setError(result.error);
      setStep('review');
    }
  }

  // ── Step: revoke ───────────────────────────────────────────────────────────
  async function handleRevoke() {
    setStep('revoking');
    await revokeConsent();
    setConsent(null);
    setStep('revoked');
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ overscrollBehavior: 'none', background: 'hsl(var(--background))', minHeight: '100vh' }}>
      <RootPageHeader title="Share with Clinic" subtitle="Clinician data sharing" />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 96px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Active consent ─────────────────────────────────────────────── */}
        {step === 'active' && consent && (
          <>
            {/* Status card */}
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(95,168,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={20} color="#2c7a4b" />
                </div>
                <div>
                  <p style={{ ...sans, fontWeight: 600, fontSize: '0.95rem', color: 'hsl(var(--foreground))' }}>Sharing is active</p>
                  <p style={{ ...sans, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                    Since {new Date(consent.consented_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div style={{ background: 'hsl(var(--muted))', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <p style={{ ...sans, fontSize: '0.72rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Invite code</p>
                <p style={{ ...sans, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.2em', color: 'hsl(var(--foreground))' }}>{consent.invite_code}</p>
              </div>

              <p style={{ ...sans, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6 }}>
                Your daily adherence counts are synced automatically. Your medication names and personal details are <strong>never</strong> shared.
              </p>
            </div>

            {/* What's shared summary */}
            <SharedDataCard shared={SHARED} notShared={NOT_SHARED} />

            {/* Revoke */}
            <div style={{ ...card, padding: '20px' }}>
              <p style={{ ...sans, fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Stop sharing</p>
              <p style={{ ...sans, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: 16 }}>
                You can stop sharing at any time. Your historical data already shared will be deleted from the clinic's dashboard within 30 days.
              </p>
              <button
                onClick={handleRevoke}
                style={{ ...sans, width: '100%', padding: '12px', border: '1px solid rgba(199,91,58,0.3)', borderRadius: 100, fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--primary))', background: 'rgba(199,91,58,0.06)', cursor: 'pointer' }}
              >
                Stop sharing with my clinic
              </button>
            </div>
          </>
        )}

        {/* ── Idle: enter invite code ─────────────────────────────────────── */}
        {step === 'idle' && (
          <>
            {/* Explainer */}
            <div style={{ ...card, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(199,91,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 size={20} color="hsl(var(--primary))" />
                </div>
                <h2 style={{ ...serif, fontSize: '1.15rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Share adherence data</h2>
              </div>
              <p style={{ ...sans, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.7, marginBottom: 0 }}>
                Your clinician can invite you to securely share your daily medication adherence. They'll give you a 6-character code to enter below.
              </p>
            </div>

            {/* Code entry form */}
            <form onSubmit={handleCodeSubmit} style={{ ...card, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ ...sans, fontSize: '0.82rem', fontWeight: 500, color: 'hsl(var(--foreground))', display: 'block', marginBottom: 8 }}>
                  Invite code from your clinician
                </label>
                <input
                  value={inviteCode}
                  onChange={handleCodeInput}
                  placeholder="ABC123"
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  style={{
                    ...sans,
                    width: '100%',
                    padding: '14px 16px',
                    background: 'hsl(var(--muted))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 10,
                    fontSize: '1.4rem',
                    letterSpacing: '0.25em',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: 'hsl(var(--foreground))',
                    outline: 'none',
                    textTransform: 'uppercase',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={inviteCode.length !== 6}
                style={{ ...sans, padding: '14px', background: inviteCode.length === 6 ? 'hsl(var(--primary))' : 'hsl(var(--muted))', color: inviteCode.length === 6 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))', border: 'none', borderRadius: 100, fontSize: '0.88rem', fontWeight: 600, cursor: inviteCode.length === 6 ? 'pointer' : 'not-allowed' }}
              >
                Continue
              </button>
            </form>

            <SharedDataCard shared={SHARED} notShared={NOT_SHARED} />
          </>
        )}

        {/* ── Review: what will be shared ─────────────────────────────────── */}
        {step === 'review' && (
          <>
            <div style={{ ...card, padding: '24px' }}>
              <p style={{ ...sans, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--primary))', marginBottom: 12 }}>
                Review before sharing
              </p>
              <h2 style={{ ...serif, fontSize: '1.2rem', fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 12 }}>
                Confirm your details
              </h2>
              <p style={{ ...sans, fontSize: '0.82rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: 20 }}>
                Choose a display name your clinician will see. This can be your real name, initials, or something completely anonymous — it's up to you.
              </p>

              <label style={{ ...sans, fontSize: '0.82rem', fontWeight: 500, color: 'hsl(var(--foreground))', display: 'block', marginBottom: 8 }}>
                Your display name (visible to your clinician)
              </label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. John S., Patient A, or leave blank"
                style={{ ...sans, width: '100%', padding: '12px 14px', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: '0.9rem', color: 'hsl(var(--foreground))', outline: 'none', marginBottom: 8 }}
              />
              <p style={{ ...sans, fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))' }}>
                If left blank, you'll appear as "Anonymous Patient"
              </p>
            </div>

            <SharedDataCard shared={SHARED} notShared={NOT_SHARED} />

            {/* Data scope summary */}
            <div style={{ ...card, padding: '20px', background: 'rgba(199,91,58,0.04)', border: '1px solid rgba(199,91,58,0.15)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Activity size={16} color="hsl(var(--primary))" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ ...sans, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.7 }}>
                  <strong style={{ color: 'hsl(var(--foreground))' }}>Sharing scope: </strong>
                  daily counts for <strong>{medications.length} medication{medications.length !== 1 ? 's' : ''}</strong>.
                  Syncs automatically when you open Axis. You can stop at any time from this screen.
                </div>
              </div>
            </div>

            {error && (
              <div role="alert" style={{ padding: '14px 16px', background: 'rgba(199,91,58,0.08)', border: '1px solid rgba(199,91,58,0.2)', borderRadius: 10, ...sans, fontSize: '0.82rem', color: 'hsl(var(--primary))' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep('idle')}
                style={{ ...sans, flex: 1, padding: '14px', border: '1px solid hsl(var(--border))', borderRadius: 100, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', background: 'none', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                style={{ ...sans, flex: 2, padding: '14px', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 'none', borderRadius: 100, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
              >
                I agree — start sharing
              </button>
            </div>
          </>
        )}

        {/* ── Submitting ──────────────────────────────────────────────────── */}
        {step === 'submitting' && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ ...sans, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>Activating sharing…</p>
          </div>
        )}

        {/* ── Revoking ────────────────────────────────────────────────────── */}
        {step === 'revoking' && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ ...sans, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>Stopping data sharing…</p>
          </div>
        )}

        {/* ── Revoked confirmation ─────────────────────────────────────────── */}
        {step === 'revoked' && (
          <div style={{ ...card, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(44,44,44,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <X size={24} color="hsl(var(--muted-foreground))" />
            </div>
            <h2 style={{ ...serif, fontSize: '1.3rem', fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 12 }}>Sharing stopped</h2>
            <p style={{ ...sans, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.7 }}>
              Your clinic's access to your adherence data has been removed. Any previously shared data will be deleted from their dashboard within 30 days.
            </p>
            <button
              onClick={() => setStep('idle')}
              style={{ ...sans, marginTop: 24, padding: '12px 28px', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 'none', borderRadius: 100, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Shared sub-component ─────────────────────────────────────────────────────

function SharedDataCard({ shared, notShared }) {
  return (
    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Activity size={14} color="hsl(var(--primary))" />
          <p style={{ ...sans, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
            What is shared
          </p>
        </div>
        {shared.map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2c7a4b', flexShrink: 0, marginTop: 7 }} />
            <p style={{ ...sans, fontSize: '0.82rem', color: 'hsl(var(--foreground))' }}>{item}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Lock size={14} color="hsl(var(--muted-foreground))" />
          <p style={{ ...sans, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
            Never shared
          </p>
        </div>
        {notShared.map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'hsl(var(--muted-foreground))', flexShrink: 0, marginTop: 7, opacity: 0.5 }} />
            <p style={{ ...sans, fontSize: '0.82rem', color: 'hsl(var(--muted-foreground))' }}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
