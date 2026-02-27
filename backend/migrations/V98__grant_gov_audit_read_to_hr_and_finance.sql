BEGIN;

-- Grant audit log read permission to HR and Finance panels (idempotent)

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name IN ('HR_ADMIN', 'FINANCE_ADMIN', 'FINANCE_HEAD')
  AND p.code = 'GOV_AUDIT_READ'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
