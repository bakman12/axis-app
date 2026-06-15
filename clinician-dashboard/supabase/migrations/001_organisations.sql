-- ─────────────────────────────────────────────────────────────────────────────
-- 001_organisations.sql
-- Multi-tenant root table. Every clinician and patient belongs to exactly one
-- organisation. The stripe_customer_id is used to verify active subscriptions
-- before granting dashboard access.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

CREATE TYPE org_plan AS ENUM ('trial', 'starter', 'growth', 'enterprise');

CREATE TABLE organisations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  slug                TEXT        NOT NULL UNIQUE,           -- e.g. "nhs-southwark-gp"
  stripe_customer_id  TEXT        UNIQUE,
  stripe_subscription_id TEXT     UNIQUE,
  plan                org_plan    NOT NULL DEFAULT 'trial',
  plan_expires_at     TIMESTAMPTZ,                           -- NULL = active forever (enterprise)
  max_clinicians      INT         NOT NULL DEFAULT 3,        -- enforced at invite time
  max_patients        INT         NOT NULL DEFAULT 50,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE organisations IS
  'Root tenant table. All RLS policies resolve org_id through clinicians → organisations.';
