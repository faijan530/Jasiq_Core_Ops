BEGIN;

-- Update role_permission mappings to use EMPLOYEE_WRITE instead of EMPLOYEE_CREATE
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name IN ('HR_ADMIN', 'SUPER_ADMIN', 'FOUNDER')
AND p.code = 'EMPLOYEE_WRITE'
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Remove old EMPLOYEE_CREATE mappings (optional cleanup)
DELETE FROM role_permission
WHERE permission_id = (SELECT id FROM permission WHERE code = 'EMPLOYEE_CREATE');

COMMIT;
