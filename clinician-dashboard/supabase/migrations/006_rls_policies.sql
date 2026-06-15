-- ─────────────────────────────────────────────────────────────────────────────
-- 006_rls_policies.sql
-- Row Level Security policies. Every policy resolves the calling user's org_id
-- through auth.uid() → clinicians.user_id → clinicians.org_id.
--
-- DESIGN PRINCIPLE: Doctor A cannot read Patient B's data if Patient B is in a
-- different organisation, EVEN IF Doctor A knows the patient UUID. The DB engine
-- enforces this — no application-layer check can substitute for RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: resolve the authenticated clinician row for the current JWT
-- Used inside policy USING expressions to avoid repeating the JOIN.
CREATE OR REPLACE FUNCTION current_clinician()
RETURNS clinicians LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM clinicians WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: return just the org_id for brevity in policies
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id FROM clinicians WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: return the role of the current clinician
CREATE OR REPLACE FUNCTION current_clinician_role()
RETURNS clinician_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM clinicians WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── Enable RLS on all tables ──────────────────────────────────────────────────

ALTER TABLE organisations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinicians                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_adherence_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_audit_log           ENABLE ROW LEVEL SECURITY;

-- ── organisations ─────────────────────────────────────────────────────────────
-- Clinicians can only see their own organisation.

CREATE POLICY org_select ON organisations
  FOR SELECT USING (id = current_org_id());

-- Only service_role (backend functions) can insert or update organisations.
-- No client-side policy needed — anon/authenticated roles have no write access.

-- ── clinicians ────────────────────────────────────────────────────────────────
-- Clinicians can see all colleagues in their org.
-- Admins can create/update clinicians in their org.
-- Nobody can delete — deactivate instead (is_active = false).

CREATE POLICY clinicians_select ON clinicians
  FOR SELECT USING (org_id = current_org_id());

CREATE POLICY clinicians_insert ON clinicians
  FOR INSERT WITH CHECK (
    org_id = current_org_id()
    AND current_clinician_role() = 'admin'
  );

CREATE POLICY clinicians_update ON clinicians
  FOR UPDATE USING (
    org_id = current_org_id()
    AND current_clinician_role() = 'admin'
  )
  WITH CHECK (
    org_id = current_org_id()  -- admin cannot move a clinician to another org
  );

-- ── patients ──────────────────────────────────────────────────────────────────
-- Any clinician in the org can read patients.
-- Clinicians and admins can create invites (INSERT).
-- Only admins can update patient records.

CREATE POLICY patients_select ON patients
  FOR SELECT USING (org_id = current_org_id());

CREATE POLICY patients_insert ON patients
  FOR INSERT WITH CHECK (
    org_id = current_org_id()
    AND current_clinician_role() IN ('admin', 'clinician')
  );

CREATE POLICY patients_update ON patients
  FOR UPDATE USING (org_id = current_org_id())
  WITH CHECK (org_id = current_org_id());

-- ── patient_adherence_snapshots ───────────────────────────────────────────────
-- Clinicians can SELECT rows in their org.
-- INSERT is handled exclusively by the sync-adherence Edge Function running as
-- service_role — authenticated clinicians CANNOT write adherence data directly.

CREATE POLICY adherence_select ON patient_adherence_snapshots
  FOR SELECT USING (org_id = current_org_id());

-- No INSERT/UPDATE/DELETE policy for authenticated role.
-- The sync-adherence function uses service_role which bypasses RLS entirely.

-- ── clinical_audit_log ────────────────────────────────────────────────────────
-- Only admins can read the audit log.
-- INSERT is from triggers (SECURITY DEFINER) and Edge Functions (service_role).
-- UPDATE and DELETE are blocked by the immutability trigger in 005.

CREATE POLICY audit_select ON clinical_audit_log
  FOR SELECT USING (
    org_id = current_org_id()
    AND current_clinician_role() = 'admin'
  );

-- No client INSERT policy — writes come from SECURITY DEFINER triggers only.
