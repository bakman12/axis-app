-- ─────────────────────────────────────────────────────────────────────────────
-- 004_patient_adherence.sql
-- Daily adherence snapshots pushed from the patient's Axis app.
-- One row per patient per calendar date. The patient app upserts this daily
-- via the sync-adherence Edge Function (service-role key, not clinician JWT).
--
-- DESIGN: We store aggregated counts — NOT individual medication names — to
-- minimise PII exposure. missed_medication_ids contains hashed medication IDs
-- so the clinician sees *that* doses were missed but not the drug name unless
-- the patient explicitly enables full sharing (future feature).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE patient_adherence_snapshots (
  id                        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                UUID    NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  org_id                    UUID    NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  date                      DATE    NOT NULL,
  total_doses_scheduled     INT     NOT NULL DEFAULT 0,
  total_doses_taken         INT     NOT NULL DEFAULT 0,
  total_doses_missed        INT     NOT NULL DEFAULT 0,
  -- Hashed medication IDs of missed doses (privacy-safe for clinician review)
  missed_medication_ids     JSONB   DEFAULT '[]',
  -- Running streak at time of snapshot
  streak_days               INT     NOT NULL DEFAULT 0,
  -- Adherence rate 0.0–1.0
  adherence_rate            NUMERIC(5,4) GENERATED ALWAYS AS (
    CASE WHEN total_doses_scheduled = 0 THEN NULL
         ELSE ROUND(total_doses_taken::NUMERIC / total_doses_scheduled, 4)
    END
  ) STORED,
  synced_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT one_snapshot_per_patient_per_day UNIQUE (patient_id, date)
);

CREATE INDEX idx_adherence_patient_date ON patient_adherence_snapshots(patient_id, date DESC);
CREATE INDEX idx_adherence_org_date     ON patient_adherence_snapshots(org_id, date DESC);
-- For clinician alert queries: "which patients had adherence < 80% this week?"
CREATE INDEX idx_adherence_rate         ON patient_adherence_snapshots(org_id, adherence_rate)
  WHERE adherence_rate IS NOT NULL;

COMMENT ON TABLE patient_adherence_snapshots IS
  'Written ONLY by the sync-adherence Edge Function (service-role). '
  'Clinicians have SELECT only — never INSERT/UPDATE/DELETE.';
