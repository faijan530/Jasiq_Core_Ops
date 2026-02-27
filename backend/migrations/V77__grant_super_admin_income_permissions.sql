BEGIN;

-- Ensure UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure required income permissions exist (idempotent)
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), v.code, v.description
FROM (
  VALUES
    ('INCOME_CATEGORY_READ', 'Read income categories'),
    ('INCOME_CATEGORY_WRITE', 'Create/update income categories'),
    ('INCOME_CLIENT_READ', 'Read clients'),
    ('INCOME_CLIENT_WRITE', 'Create/update clients'),
    ('INCOME_CREATE', 'Create income drafts'),
    ('INCOME_UPDATE', 'Update income drafts'),
    ('INCOME_READ', 'Read income'),
    ('INCOME_SUBMIT', 'Submit income for approval'),
    ('INCOME_APPROVE', 'Approve income'),
    ('INCOME_REJECT', 'Reject income'),
    ('INCOME_MARK_PAID', 'Mark income paid (append-only payments)'),
    ('INCOME_DOCUMENT_UPLOAD', 'Upload income documents'),
    ('INCOME_DOCUMENT_READ', 'Read/download income documents'),
    ('INCOME_MONTH_CLOSE_OVERRIDE', 'Override month close for income')
) AS v(code, description)
WHERE NOT EXISTS (SELECT 1 FROM permission p WHERE p.code = v.code);

-- Grant full income permissions to SUPER_ADMIN (idempotent)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'INCOME_CATEGORY_READ','INCOME_CATEGORY_WRITE',
  'INCOME_CLIENT_READ','INCOME_CLIENT_WRITE',
  'INCOME_CREATE','INCOME_UPDATE','INCOME_READ',
  'INCOME_SUBMIT','INCOME_APPROVE','INCOME_REJECT',
  'INCOME_MARK_PAID','INCOME_DOCUMENT_UPLOAD','INCOME_DOCUMENT_READ',
  'INCOME_MONTH_CLOSE_OVERRIDE'
)
WHERE r.name = 'SUPER_ADMIN'
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
