BEGIN;

-- Ensure UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert missing permissions (idempotent)
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'PAYROLL_RUN_READ', 'Read payroll runs'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'PAYROLL_RUN_READ');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'FINANCE_REPORT_READ', 'Read finance reports'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'FINANCE_REPORT_READ');

-- Attach permissions to FINANCE_ADMIN (idempotent)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'FINANCE_ADMIN'
AND p.code IN ('PAYROLL_RUN_READ', 'FINANCE_REPORT_READ')
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
