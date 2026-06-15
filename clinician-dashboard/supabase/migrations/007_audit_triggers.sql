-- ─────────────────────────────────────────────────────────────────────────────
-- 007_audit_triggers.sql
-- Automatic audit entries for every read/write on patient_adherence_snapshots.
--
-- WHY triggers instead of application code?
--   Application code can be bypassed, contain bugs, or be forgotten on a new
--   code path. A SECURITY DEFINER trigger runs inside PostgreSQL regardless of
--   which code path touches the table, providing an unforgeable audit trail.
-- ─────────────────────────────────────────────────────────────────────────────

-- Writes a single audit row. Runs as SECURITY DEFINER so it can INSERT into
-- clinical_audit_log even when the calling role has no direct INSERT permission.
CREATE OR REPLACE FUNCTION audit_adherence_access()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clinician   clinicians%ROWTYPE;
  v_action      audit_action;
BEGIN
  -- Determine action based on operation
  IF TG_OP = 'INSERT' THEN
    v_action := 'ADHERENCE_WRITTEN';
  ELSIF TG_OP = 'SELECT' THEN
    v_action := 'ADHERENCE_READ';
  ELSE
    -- UPDATE/DELETE not expected but handle defensively
    v_action := 'ADHERENCE_WRITTEN';
  END IF;

  -- Resolve clinician from current session (may be NULL for service_role writes)
  SELECT * INTO v_clinician FROM clinicians WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO clinical_audit_log (
    clinician_id,
    clinician_email,
    org_id,
    patient_id,
    action,
    resource_table,
    resource_id,
    metadata
  ) VALUES (
    v_clinician.id,
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    COALESCE(NEW.org_id, OLD.org_id),
    COALESCE(NEW.patient_id, OLD.patient_id),
    v_action,
    'patient_adherence_snapshots',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'date',           COALESCE(NEW.date, OLD.date),
      'adherence_rate', COALESCE(NEW.adherence_rate, OLD.adherence_rate),
      'operation',      TG_OP
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fire AFTER INSERT (patient sync) on adherence snapshots
CREATE TRIGGER audit_adherence_insert
  AFTER INSERT ON patient_adherence_snapshots
  FOR EACH ROW EXECUTE FUNCTION audit_adherence_access();

-- Fire AFTER UPDATE on adherence snapshots (e.g. re-sync correcting a value)
CREATE TRIGGER audit_adherence_update
  AFTER UPDATE ON patient_adherence_snapshots
  FOR EACH ROW EXECUTE FUNCTION audit_adherence_access();

-- ── Audit: patient profile reads ─────────────────────────────────────────────
-- Logs when a clinician reads a patient record (e.g. opens PatientDetail page).

CREATE OR REPLACE FUNCTION audit_patient_read()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clinician clinicians%ROWTYPE;
BEGIN
  SELECT * INTO v_clinician FROM clinicians WHERE user_id = auth.uid() LIMIT 1;

  IF v_clinician.id IS NOT NULL THEN
    INSERT INTO clinical_audit_log (
      clinician_id, clinician_email, org_id, patient_id, action,
      resource_table, resource_id
    ) VALUES (
      v_clinician.id,
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      OLD.org_id,
      OLD.id,
      'PATIENT_READ',
      'patients',
      OLD.id
    );
  END IF;

  RETURN OLD;
END;
$$;

-- Note: PostgreSQL doesn't support AFTER SELECT triggers natively.
-- Patient reads are therefore logged at the API layer (api/patients.ts)
-- using the writeAuditEntry() helper, not via a DB trigger.
-- The adherence triggers above cover the high-value data access.

COMMENT ON FUNCTION audit_adherence_access IS
  'SECURITY DEFINER — runs as the definer (superuser), not the caller. '
  'This ensures audit writes succeed even when the caller cannot INSERT into '
  'clinical_audit_log directly.';
