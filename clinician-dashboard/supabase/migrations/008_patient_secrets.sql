-- ─────────────────────────────────────────────────────────────────────────────
-- 008_patient_secrets.sql
-- Per-patient HMAC secrets used to verify sync payloads.
-- Stored separately from `patients` so a SELECT on patients never accidentally
-- exposes the secret (defence in depth: even with a buggy RLS policy on
-- `patients`, the secret remains unreachable).
--
-- ACCESS MODEL:
--   • No clinician role can SELECT, UPDATE, or DELETE rows here
--   • Only service_role (Edge Functions) can read/write
--   • The accept-invite function INSERTs once; sync-adherence SELECTs per call
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE patient_secrets (
  patient_id  UUID        PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  -- Hex-encoded SHA-256 (64 chars). Generated server-side in accept-invite.
  secret_hex  TEXT        NOT NULL CHECK (char_length(secret_hex) = 64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Tracks the most recent verified sync (purely for audit/debugging)
  last_used_at TIMESTAMPTZ
);

-- Lock the table to service_role only. Even authenticated clinicians cannot
-- query this — they don't need to, and RLS would let any policy bug leak it.
ALTER TABLE patient_secrets ENABLE ROW LEVEL SECURITY;
-- NO POLICIES created → no authenticated/anon row is visible. Only service_role
-- (which bypasses RLS) can access this table.

REVOKE ALL ON patient_secrets FROM authenticated, anon;

COMMENT ON TABLE patient_secrets IS
  'HMAC keys for sync-adherence payload verification. '
  'Accessible ONLY via service_role (Edge Functions). '
  'Never exposed to clinician JWTs.';
