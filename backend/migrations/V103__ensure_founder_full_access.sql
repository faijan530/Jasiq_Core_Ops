BEGIN;

-- Ensure FOUNDER has SYSTEM_FULL_ACCESS
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'FOUNDER'
  AND p.code = 'SYSTEM_FULL_ACCESS'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
