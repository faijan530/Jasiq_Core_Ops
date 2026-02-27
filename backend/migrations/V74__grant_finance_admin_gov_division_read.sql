BEGIN;

-- Ensure UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure permission exists (idempotent)
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'GOV_DIVISION_READ', 'Read divisions'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'GOV_DIVISION_READ');

-- Attach permission to FINANCE_ADMIN (idempotent)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'FINANCE_ADMIN'
  AND p.code = 'GOV_DIVISION_READ'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
