BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(60) NULL,
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS division_id UUID NULL REFERENCES division(id),
  ADD COLUMN IF NOT EXISTS meta JSONB NULL,
  ADD COLUMN IF NOT EXISTS actor_roles JSONB NULL,
  ADD COLUMN IF NOT EXISTS actor_email VARCHAR(180) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_log_severity_check'
  ) THEN
    ALTER TABLE audit_log
      ADD CONSTRAINT audit_log_severity_check
      CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_log_scope_check'
  ) THEN
    ALTER TABLE audit_log
      ADD CONSTRAINT audit_log_scope_check
      CHECK (scope IS NULL OR scope IN ('COMPANY','DIVISION'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_division ON audit_log(division_id);

COMMIT;
