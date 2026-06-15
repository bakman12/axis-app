-- ─────────────────────────────────────────────────────────────────────────────
-- 009_accept_invite_rpc.sql
-- Atomic accept-invite operation.
--
-- WHY:
--   Previously, accept-invite/index.ts called supabase.update(patients) then
--   supabase.upsert(patient_secrets) as two separate REST calls. If the second
--   failed, the patient was consented in the DB but had no secret — they could
--   never sync, and the re-accept path returned 409 because consent was already
--   marked granted. Permanent lockout requiring clinician intervention.
--
--   This RPC wraps both writes in a single transaction. Either both succeed
--   and the function returns the org_id, or both roll back and the function
--   raises — no half-committed state is possible.
--
-- SECURITY:
--   SECURITY DEFINER so the function can write to patient_secrets even though
--   the calling role (service_role from the Edge Function) already has full
--   access — keeping it DEFINER means later policy tightening on the table
--   doesn't break the flow.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION accept_invite_atomic(
  p_invite_code         TEXT,
  p_axis_user_id_hash   TEXT,
  p_display_name        TEXT,
  p_secret_hex          TEXT
)
RETURNS TABLE (
  patient_id  UUID,
  org_id      UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id  UUID;
  v_org_id      UUID;
  v_existing    patients%ROWTYPE;
BEGIN
  -- Re-validate the invite inside the transaction so concurrent accept-invite
  -- calls for the same code can't both win the race.
  SELECT * INTO v_existing
  FROM patients
  WHERE invite_code = p_invite_code
  FOR UPDATE;

  IF v_existing.id IS NULL THEN
    RAISE EXCEPTION 'INVITE_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_existing.invite_expires_at < NOW() THEN
    RAISE EXCEPTION 'INVITE_EXPIRED' USING ERRCODE = 'P0002';
  END IF;

  IF v_existing.consent_revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'INVITE_REVOKED' USING ERRCODE = 'P0003';
  END IF;

  IF v_existing.consent_granted_at IS NOT NULL
     AND v_existing.axis_user_id_hash NOT LIKE 'pending::%' THEN
    RAISE EXCEPTION 'INVITE_ALREADY_USED' USING ERRCODE = 'P0004';
  END IF;

  -- Update the patient row
  UPDATE patients
  SET
    axis_user_id_hash  = p_axis_user_id_hash,
    consent_granted_at = NOW(),
    display_name       = COALESCE(p_display_name, display_name)
  WHERE id = v_existing.id;

  -- Write the HMAC secret. If THIS fails, the UPDATE above rolls back too.
  INSERT INTO patient_secrets (patient_id, secret_hex)
  VALUES (v_existing.id, p_secret_hex)
  ON CONFLICT (patient_id) DO UPDATE
    SET secret_hex = EXCLUDED.secret_hex,
        created_at = NOW();

  -- Audit log: written inside the transaction so it's also rolled back on error
  INSERT INTO clinical_audit_log (
    org_id, patient_id, action, resource_table, resource_id, metadata
  )
  VALUES (
    v_existing.org_id, v_existing.id,
    'PATIENT_CONSENT_GRANTED', 'patients', v_existing.id,
    jsonb_build_object('invite_code', p_invite_code)
  );

  v_patient_id := v_existing.id;
  v_org_id     := v_existing.org_id;

  RETURN QUERY SELECT v_patient_id, v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION accept_invite_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invite_atomic TO service_role;

COMMENT ON FUNCTION accept_invite_atomic IS
  'Single-transaction accept-invite. Either all of: patient row update, secret '
  'insert, and audit log entry succeed, or none do. Replaces the two separate '
  'REST calls in accept-invite/index.ts.';
