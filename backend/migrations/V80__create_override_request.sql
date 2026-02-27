BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS override_request (
  id UUID PRIMARY KEY,
  override_type VARCHAR(50) NOT NULL,
  division_id UUID NULL REFERENCES division(id),
  target_entity_type VARCHAR(50) NOT NULL,
  target_entity_id UUID NOT NULL,
  requested_action VARCHAR(80) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('REQUESTED','APPROVED','REJECTED','EXECUTED')),
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_by UUID NULL,
  approved_at TIMESTAMP NULL,
  approval_reason TEXT NULL,
  executed_by UUID NULL,
  executed_at TIMESTAMP NULL,
  execution_result JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_override_request_status ON override_request(status);
CREATE INDEX IF NOT EXISTS idx_override_request_override_type ON override_request(override_type);
CREATE INDEX IF NOT EXISTS idx_override_request_target_entity ON override_request(target_entity_type, target_entity_id);

COMMIT;
