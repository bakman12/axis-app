-- ─────────────────────────────────────────────────────────────────────────────
-- 003_patients.sql
-- A patient record is created when a clinician invites a patient AND the patient
-- accepts the consent flow in the Axis mobile app. No patient data is ever stored
-- here without explicit consent_granted_at being set.
--
-- PRIVACY: axis_user_id is a one-way hash of the patient's Base44 user ID.
-- We never store the patient's email, name, or PII in plaintext. display_name
-- is set by the PATIENT in their app during consent (can be pseudonymous).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE patients (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  -- Hashed reference to the patient's Axis app account (SHA-256 of Base44 user ID)
  axis_user_id_hash   TEXT        NOT NULL,
  -- Invite token used during the patient consent flow (6-char alphanumeric)
  invite_code         TEXT        NOT NULL UNIQUE,
  invite_expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  -- Patient-supplied display name (can be "Patient A", initials, etc.)
  display_name        TEXT        NOT NULL DEFAULT 'Unnamed Patient',
  -- Consent timestamp — NULL means invite pending, NOT NULL means actively sharing
  consent_granted_at  TIMESTAMPTZ,
  -- Patient can revoke at any time from their app
  consent_revoked_at  TIMESTAMPTZ,
  -- Clinician who created the invite (for audit trail)
  invited_by          UUID        REFERENCES clinicians(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT axis_user_unique_per_org UNIQUE (org_id, axis_user_id_hash)
);

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_patients_org_id       ON patients(org_id);
CREATE INDEX idx_patients_invite_code  ON patients(invite_code);
CREATE INDEX idx_patients_consent      ON patients(consent_granted_at) WHERE consent_granted_at IS NOT NULL;

COMMENT ON COLUMN patients.axis_user_id_hash IS
  'SHA-256(base44_user_id + org_id) — links back to the patient app without storing PII.';

COMMENT ON COLUMN patients.consent_revoked_at IS
  'When set, the sync-adherence Edge Function will reject further pushes from this patient.';
