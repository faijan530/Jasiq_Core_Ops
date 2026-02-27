BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'GOV_MONTH_CLOSE_READ', 'View month close status'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'GOV_MONTH_CLOSE_READ');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'FINANCE_ADMIN'
  AND p.code = 'GOV_MONTH_CLOSE_READ'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
