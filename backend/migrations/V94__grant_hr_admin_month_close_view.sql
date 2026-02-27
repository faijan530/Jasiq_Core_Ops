BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'MONTH_CLOSE_VIEW', 'View month close records'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'MONTH_CLOSE_VIEW');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'HR_ADMIN'
  AND p.code = 'MONTH_CLOSE_VIEW'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
