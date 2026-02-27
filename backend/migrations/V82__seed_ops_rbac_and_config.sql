BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- OPS permissions (insert only if missing)
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_INBOX_READ', 'Read Ops inbox aggregation'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_INBOX_READ');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_INBOX_ACTION', 'Execute Ops inbox actions'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_INBOX_ACTION');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_ALERT_READ', 'Read ops alerts'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_ALERT_READ');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_ALERT_ACK', 'Acknowledge ops alerts'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_ALERT_ACK');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_ALERT_RESOLVE', 'Resolve ops alerts'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_ALERT_RESOLVE');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_OVERRIDE_REQUEST', 'Create override requests'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_OVERRIDE_REQUEST');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_OVERRIDE_REVIEW', 'Approve/reject override requests'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_OVERRIDE_REVIEW');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_OVERRIDE_EXECUTE', 'Execute approved override requests'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_OVERRIDE_EXECUTE');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_DATA_QUALITY_RUN', 'Run data quality checks'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_DATA_QUALITY_RUN');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_DATA_QUALITY_READ', 'Read data quality findings'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_DATA_QUALITY_READ');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_DATA_QUALITY_ACK', 'Acknowledge data quality findings'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_DATA_QUALITY_ACK');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_DATA_QUALITY_RESOLVE', 'Resolve data quality findings'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_DATA_QUALITY_RESOLVE');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'OPS_DASHBOARD_READ', 'Read ops dashboard summary'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'OPS_DASHBOARD_READ');

-- Map OPS permissions to roles (idempotent)
-- SUPER_ADMIN gets everything
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'SUPER_ADMIN'
  AND p.code IN (
    'OPS_INBOX_READ','OPS_INBOX_ACTION',
    'OPS_ALERT_READ','OPS_ALERT_ACK','OPS_ALERT_RESOLVE',
    'OPS_OVERRIDE_REQUEST','OPS_OVERRIDE_REVIEW','OPS_OVERRIDE_EXECUTE',
    'OPS_DATA_QUALITY_RUN','OPS_DATA_QUALITY_READ','OPS_DATA_QUALITY_ACK','OPS_DATA_QUALITY_RESOLVE',
    'OPS_DASHBOARD_READ'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- FOUNDER gets everything
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'FOUNDER'
  AND p.code IN (
    'OPS_INBOX_READ','OPS_INBOX_ACTION',
    'OPS_ALERT_READ','OPS_ALERT_ACK','OPS_ALERT_RESOLVE',
    'OPS_OVERRIDE_REQUEST','OPS_OVERRIDE_REVIEW','OPS_OVERRIDE_EXECUTE',
    'OPS_DATA_QUALITY_RUN','OPS_DATA_QUALITY_READ','OPS_DATA_QUALITY_ACK','OPS_DATA_QUALITY_RESOLVE',
    'OPS_DASHBOARD_READ'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- FINANCE_ADMIN gets everything (Ops is cross-finance operations)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'FINANCE_ADMIN'
  AND p.code IN (
    'OPS_INBOX_READ','OPS_INBOX_ACTION',
    'OPS_ALERT_READ','OPS_ALERT_ACK','OPS_ALERT_RESOLVE',
    'OPS_OVERRIDE_REQUEST','OPS_OVERRIDE_REVIEW','OPS_OVERRIDE_EXECUTE',
    'OPS_DATA_QUALITY_RUN','OPS_DATA_QUALITY_READ','OPS_DATA_QUALITY_ACK','OPS_DATA_QUALITY_RESOLVE',
    'OPS_DASHBOARD_READ'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Seed system_config flags (idempotent)
INSERT INTO system_config (key, value, description)
SELECT 'OPS_INBOX_ENABLED', 'true', 'Enable Ops inbox aggregation'
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'OPS_INBOX_ENABLED');

INSERT INTO system_config (key, value, description)
SELECT 'ALERTS_ENABLED', 'true', 'Enable Ops alerts'
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'ALERTS_ENABLED');

INSERT INTO system_config (key, value, description)
SELECT 'OVERRIDE_ENABLED', 'true', 'Enable override request workflow'
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'OVERRIDE_ENABLED');

INSERT INTO system_config (key, value, description)
SELECT 'DATA_QUALITY_CHECKS_ENABLED', 'true', 'Enable data quality checks'
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'DATA_QUALITY_CHECKS_ENABLED');

INSERT INTO system_config (key, value, description)
SELECT 'APPROVAL_SLA_HOURS', '48', 'Default approval SLA hours for Ops inbox'
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'APPROVAL_SLA_HOURS');

COMMIT;
