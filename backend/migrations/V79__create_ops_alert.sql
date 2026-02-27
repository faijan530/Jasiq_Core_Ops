BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ops_alert (
  id UUID PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  division_id UUID NULL REFERENCES division(id),
  related_entity_type VARCHAR(50) NULL,
  related_entity_id UUID NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  acknowledged_at TIMESTAMP NULL,
  acknowledged_by UUID NULL,
  resolved_at TIMESTAMP NULL,
  resolved_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_ops_alert_status ON ops_alert(status);
CREATE INDEX IF NOT EXISTS idx_ops_alert_alert_type ON ops_alert(alert_type);
CREATE INDEX IF NOT EXISTS idx_ops_alert_division_id ON ops_alert(division_id);
CREATE INDEX IF NOT EXISTS idx_ops_alert_created_at ON ops_alert(created_at);

COMMIT;
