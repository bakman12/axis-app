-- ─────────────────────────────────────────────────────────────────────────────
-- 005_clinical_audit_log.sql
-- IMMUTABLE append-only audit log. Every read/write against patient data tables
-- produces a row here automatically (via triggers in 007) and from the API layer.
--
-- IMMUTABILITY is enforced at three levels:
--   1. No UPDATE or DELETE permissions granted to any role (see 006_rls_policies)
--   2. A BEFORE UPDATE/DELETE trigger raises an exception
--   3. No FK cascade deletes (we store denormalized strings for deleted resources)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE audit_action AS ENUM (
  'LOGIN',
  'MFA_ENROLLED',
  'PATIENT_INVITED',
  'PATIENT_CONSENT_GRANTED',
  'PATIENT_CONSENT_REVOKED',
  'ADHERENCE_READ',          -- clinician viewed patient adherence data
  'ADHERENCE_WRITTEN',       -- patient app pushed a snapshot
  'ADHERENCE_EXPORT',        -- clinician exported adherence as CSV
  'PATIENT_READ',            -- clinician viewed patient profile
  'PATIENT_CREATED',
  'CLINICIAN_CREATED',
  'CLINICIAN_DEACTIVATED',
  'SETTINGS_CHANGED'
);

CREATE TABLE clinical_audit_log (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Denormalized so the record survives even if the source row is deleted
  clinician_id    UUID          REFERENCES clinicians(id) ON DELETE SET NULL,
  clinician_email TEXT,                          -- denormalized copy at write time
  org_id          UUID          NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  patient_id      UUID          REFERENCES patients(id) ON DELETE SET NULL,
  action          audit_action  NOT NULL,
  resource_table  TEXT,                          -- e.g. 'patient_adherence_snapshots'
  resource_id     UUID,                          -- the specific row accessed
  -- Network context (written by Edge Functions from request headers)
  ip_address      INET,
  user_agent      TEXT,
  -- Freeform metadata: query params, filter applied, export row count, etc.
  metadata        JSONB         DEFAULT '{}',
  -- Immutable timestamp — never set by the client
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()

  -- Deliberately NO updated_at — this row must never change.
);

-- Prevent any modification or deletion of audit rows
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'clinical_audit_log is append-only. UPDATE and DELETE are forbidden. '
    'If this is an error contact your Axis system administrator.';
END;
$$;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON clinical_audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON clinical_audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- Indexes for the AuditLogTable UI and compliance exports
CREATE INDEX idx_audit_org_created     ON clinical_audit_log(org_id, created_at DESC);
CREATE INDEX idx_audit_clinician       ON clinical_audit_log(clinician_id, created_at DESC);
CREATE INDEX idx_audit_patient         ON clinical_audit_log(patient_id, created_at DESC);
CREATE INDEX idx_audit_action          ON clinical_audit_log(action, created_at DESC);

COMMENT ON TABLE clinical_audit_log IS
  'Append-only HIPAA/GDPR audit trail. '
  'Triggers in 007_audit_triggers.sql auto-populate ADHERENCE_READ and ADHERENCE_WRITTEN. '
  'All other entries are written by Edge Functions.';
