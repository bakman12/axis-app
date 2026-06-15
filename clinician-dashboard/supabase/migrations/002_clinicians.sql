-- ─────────────────────────────────────────────────────────────────────────────
-- 002_clinicians.sql
-- Links a Supabase auth.users row to an organisation. One auth user = one
-- clinician profile. MFA is tracked here so we can enforce it at the API layer.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE clinician_role AS ENUM ('admin', 'clinician', 'viewer');

CREATE TABLE clinicians (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK to Supabase Auth — populated on first login via magic link
  user_id          UUID          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id           UUID          NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role             clinician_role NOT NULL DEFAULT 'clinician',
  full_name        TEXT,
  -- MFA state (Supabase handles the actual TOTP secret via auth.mfa_factors)
  mfa_enrolled_at  TIMESTAMPTZ,
  -- Login telemetry (written by Edge Function, never by client)
  last_login_at    TIMESTAMPTZ,
  last_login_ip    INET,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER clinicians_updated_at
  BEFORE UPDATE ON clinicians
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index used in every RLS policy lookup: "what org is this JWT user in?"
CREATE INDEX idx_clinicians_user_id  ON clinicians(user_id);
CREATE INDEX idx_clinicians_org_id   ON clinicians(org_id);

COMMENT ON COLUMN clinicians.mfa_enrolled_at IS
  'Set by the post-enrollment Edge Function once TOTP is verified. NULL = MFA not yet set up.';
