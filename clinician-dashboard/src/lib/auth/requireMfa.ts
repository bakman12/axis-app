// auth/requireMfa.ts
// ─────────────────────────────────────────────────────────────────────────────
// MFA challenge helpers. Used by the Login page to drive the TOTP flow.
// Supabase handles the TOTP secret and verification server-side.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabaseClient';

/**
 * Begin TOTP enrolment.
 * Returns the QR code URI and secret to display to the clinician.
 * Call once per clinician — subsequent calls generate a new secret.
 */
export async function beginMfaEnrolment(): Promise<{
  qrCodeUri: string;
  secret: string;
  factorId: string;
}> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Axis Clinician Dashboard',
  });

  if (error || !data) throw new Error(error?.message ?? 'MFA enrolment failed');

  return {
    qrCodeUri: data.totp.qr_code,
    secret:    data.totp.secret,
    factorId:  data.id,
  };
}

/**
 * Verify a TOTP code to complete enrolment or challenge.
 * @param factorId — returned from beginMfaEnrolment or listMfaFactors
 * @param code     — 6-digit code from authenticator app
 */
export async function verifyMfaCode(factorId: string, code: string): Promise<void> {
  // First, create a challenge
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr || !challenge) throw new Error(challengeErr?.message ?? 'Challenge failed');

  // Then verify the code
  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyErr) throw new Error(verifyErr.message);
}

/**
 * List enrolled MFA factors for the current user.
 * Used to check if MFA is already set up.
 */
export async function listMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return data?.totp ?? [];
}

/**
 * Challenge an existing TOTP factor (login step 2).
 * Returns the factor ID to pass to verifyMfaCode.
 */
export async function getMfaFactorIdForLogin(): Promise<string | null> {
  const factors = await listMfaFactors();
  const verified = factors.find(f => f.status === 'verified');
  return verified?.id ?? null;
}
