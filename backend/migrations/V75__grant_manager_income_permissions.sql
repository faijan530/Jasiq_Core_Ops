BEGIN;

-- Ensure UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure required income permissions exist (idempotent)
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), v.code, v.description
FROM (
  VALUES
    ('INCOME_CATEGORY_READ', 'Read income categories'),
    ('INCOME_CLIENT_READ', 'Read clients'),
    ('INCOME_CREATE', 'Create income drafts'),
    ('INCOME_READ', 'Read income'),
    ('INCOME_SUBMIT', 'Submit income for approval')
) AS v(code, description)
WHERE NOT EXISTS (SELECT 1 FROM permission p WHERE p.code = v.code);

-- Grant manager income permissions (idempotent)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'INCOME_CATEGORY_READ',
  'INCOME_CLIENT_READ',
  'INCOME_CREATE',
  'INCOME_READ',
  'INCOME_SUBMIT'
)
WHERE r.name = 'MANAGER'
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
