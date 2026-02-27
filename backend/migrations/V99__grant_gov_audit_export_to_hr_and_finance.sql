BEGIN;

-- Grant audit export permission to HR and Finance roles (idempotent)
-- NOTE: Audit export is sensitive; adjust roles as needed.

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name IN ('HR_ADMIN', 'FINANCE_ADMIN', 'FINANCE_HEAD')
  AND p.code = 'GOV_AUDIT_EXPORT'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
