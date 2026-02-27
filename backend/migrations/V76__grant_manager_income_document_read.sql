BEGIN;

-- Ensure UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure permission exists (idempotent)
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'INCOME_DOCUMENT_READ', 'Read/download income documents'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'INCOME_DOCUMENT_READ');

-- Grant to MANAGER (idempotent)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'MANAGER'
  AND p.code = 'INCOME_DOCUMENT_READ'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
