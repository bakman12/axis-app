// Login.tsx
// Magic Link email entry → MFA TOTP challenge (if enrolled) → Dashboard
// No passwords are ever entered or stored.

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext';
import {
  getMfaFactorIdForLogin,
  verifyMfaCode,
  beginMfaEnrolment,
} from '../lib/auth/requireMfa';

const sans = { fontFamily: 'Inter, sans-serif' } as const;
const serif = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

type Step = 'email' | 'check-email' | 'mfa-challenge' | 'mfa-enrol';

export default function Login() {
  const { signInWithMagicLink, mfaPending } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';
  const urlError   = new URLSearchParams(location.search).get('error');

  const [step, setStep]       = useState<Step>('email');
  const [email, setEmail]     = useState('');
  const [totpCode, setCode]   = useState('');
  const [factorId, setFactor] = useState('');
  const [qrUri, setQr]        = useState('');
  const [secret, setSecret]   = useState('');
  const [error, setError]     = useState<string | null>(urlError);
  const [busy, setBusy]       = useState(false);

  // Step 1 — send magic link
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithMagicLink(email);
      setStep('check-email');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setBusy(false);
    }
  }

  // After magic link is clicked, Supabase redirects back.
  // AuthContext detects the session and sets mfaPending.
  // The user is redirected here by ProtectedRoute with /mfa state.
  // Step 2 — resolve MFA
  async function handleMfaInit() {
    setBusy(true);
    try {
      const fid = await getMfaFactorIdForLogin();
      if (fid) {
        setFactor(fid);
        setStep('mfa-challenge');
      } else {
        // No factor enrolled yet — begin enrolment
        const { qrCodeUri, secret: s, factorId: f } = await beginMfaEnrolment();
        setQr(qrCodeUri);
        setSecret(s);
        setFactor(f);
        setStep('mfa-enrol');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'MFA setup failed');
    } finally {
      setBusy(false);
    }
  }

  // Step 3 — verify TOTP code (both challenge and enrolment)
  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyMfaCode(factorId, totpCode.replace(/\s/g, ''));
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code — try again');
    } finally {
      setBusy(false);
    }
  }

  // When mfaPending is detected from AuthContext, jump straight to MFA
  if (mfaPending && step === 'email') {
    handleMfaInit();
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf9f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#fff',
        border: '1px solid rgba(44,44,44,0.1)',
        borderRadius: 20,
        padding: '48px 40px',
        boxShadow: '0 4px 32px rgba(44,44,44,0.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ ...serif, fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#2c2c2c' }}>
            Axis<span style={{ color: '#c75b3a' }}>.</span>
          </h1>
          <p style={{ ...sans, fontSize: '0.78rem', color: '#8a8a8a', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
            Clinician Dashboard
          </p>
        </div>

        {error && (
          <div role="alert" style={{ padding: '12px 16px', background: 'rgba(199,91,58,0.08)', border: '1px solid rgba(199,91,58,0.2)', borderRadius: 10, marginBottom: 20, ...sans, fontSize: '0.82rem', color: '#c75b3a' }}>
            {error === 'no_profile'   ? 'Your email is not registered as a clinician. Contact your organisation admin.'
            : error === 'deactivated' ? 'Your account has been deactivated. Contact your organisation admin.'
            : error}
          </div>
        )}

        {/* Step: Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            <label style={{ ...sans, fontSize: '0.82rem', fontWeight: 500, color: '#2c2c2c', display: 'block', marginBottom: 8 }}>
              Work email address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@clinic.nhs.uk"
              style={{ ...sans, width: '100%', padding: '12px 14px', border: '1px solid rgba(44,44,44,0.15)', borderRadius: 10, fontSize: '0.9rem', color: '#2c2c2c', background: '#faf9f6', outline: 'none', marginBottom: 20 }}
            />
            <button
              type="submit"
              disabled={busy}
              style={{ ...sans, width: '100%', padding: '14px', background: '#c75b3a', color: '#faf9f6', border: 'none', borderRadius: 100, fontSize: '0.88rem', fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
            >
              {busy ? 'Sending…' : 'Send Magic Link'}
            </button>
            <p style={{ ...sans, fontSize: '0.75rem', color: '#8a8a8a', textAlign: 'center', marginTop: 16 }}>
              No password required. A secure sign-in link will be emailed to you.
            </p>
          </form>
        )}

        {/* Step: Check email */}
        {step === 'check-email' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <h2 style={{ ...serif, fontSize: '1.3rem', fontWeight: 600, color: '#2c2c2c', marginBottom: 10 }}>Check your inbox</h2>
            <p style={{ ...sans, fontSize: '0.85rem', color: '#8a8a8a', lineHeight: 1.6 }}>
              A sign-in link has been sent to <strong style={{ color: '#2c2c2c' }}>{email}</strong>.
              Click the link to continue — it expires in 1 hour.
            </p>
          </div>
        )}

        {/* Step: MFA challenge (existing factor) */}
        {step === 'mfa-challenge' && (
          <form onSubmit={handleTotpVerify}>
            <h2 style={{ ...serif, fontSize: '1.3rem', fontWeight: 600, color: '#2c2c2c', marginBottom: 8 }}>Two-factor verification</h2>
            <p style={{ ...sans, fontSize: '0.82rem', color: '#8a8a8a', marginBottom: 24, lineHeight: 1.6 }}>
              Enter the 6-digit code from your authenticator app.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              value={totpCode}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              style={{ ...sans, width: '100%', padding: '12px 14px', border: '1px solid rgba(44,44,44,0.15)', borderRadius: 10, fontSize: '1.4rem', letterSpacing: '0.3em', textAlign: 'center', color: '#2c2c2c', background: '#faf9f6', outline: 'none', marginBottom: 20 }}
            />
            <button
              type="submit"
              disabled={busy || totpCode.length < 6}
              style={{ ...sans, width: '100%', padding: '14px', background: '#c75b3a', color: '#faf9f6', border: 'none', borderRadius: 100, fontSize: '0.88rem', fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: (busy || totpCode.length < 6) ? 0.6 : 1 }}
            >
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        {/* Step: MFA enrolment (first time) */}
        {step === 'mfa-enrol' && (
          <div>
            <h2 style={{ ...serif, fontSize: '1.2rem', fontWeight: 600, color: '#2c2c2c', marginBottom: 8 }}>Set up two-factor authentication</h2>
            <p style={{ ...sans, fontSize: '0.82rem', color: '#8a8a8a', marginBottom: 20, lineHeight: 1.6 }}>
              MFA is required for all clinician accounts. Scan the QR code with Google Authenticator, Authy, or any TOTP app.
            </p>
            {qrUri && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img src={qrUri} alt="MFA QR code" width={180} height={180} style={{ borderRadius: 8, border: '1px solid rgba(44,44,44,0.1)' }} />
                <p style={{ ...sans, fontSize: '0.72rem', color: '#8a8a8a', marginTop: 10 }}>
                  Manual entry: <code style={{ background: '#f2f0ea', padding: '2px 6px', borderRadius: 4 }}>{secret}</code>
                </p>
              </div>
            )}
            <form onSubmit={handleTotpVerify}>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={totpCode}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code to confirm"
                style={{ ...sans, width: '100%', padding: '12px 14px', border: '1px solid rgba(44,44,44,0.15)', borderRadius: 10, fontSize: '1.2rem', letterSpacing: '0.2em', textAlign: 'center', color: '#2c2c2c', background: '#faf9f6', outline: 'none', marginBottom: 16 }}
              />
              <button
                type="submit"
                disabled={busy || totpCode.length < 6}
                style={{ ...sans, width: '100%', padding: '14px', background: '#c75b3a', color: '#faf9f6', border: 'none', borderRadius: 100, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', opacity: (busy || totpCode.length < 6) ? 0.6 : 1 }}
              >
                {busy ? 'Confirming…' : 'Confirm & Enable MFA'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
