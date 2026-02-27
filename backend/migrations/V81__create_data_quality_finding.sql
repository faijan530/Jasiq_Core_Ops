BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS data_quality_finding (
  id UUID PRIMARY KEY,
  finding_type VARCHAR(80) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  title VARCHAR(200) NOT NULL,
  details TEXT NOT NULL,
  division_id UUID NULL REFERENCES division(id),
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  resolved_at TIMESTAMP NULL,
  resolved_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_dq_finding_status ON data_quality_finding(status);
CREATE INDEX IF NOT EXISTS idx_dq_finding_type ON data_quality_finding(finding_type);
CREATE INDEX IF NOT EXISTS idx_dq_finding_division_id ON data_quality_finding(division_id);

COMMIT;
