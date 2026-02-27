-- Grant all employee permissions to SUPER_ADMIN role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'SUPER_ADMIN'
AND p.code IN (
  'EMPLOYEE_READ',
  'EMPLOYEE_WRITE', 
  'EMPLOYEE_COMPENSATION_WRITE',
  'EMPLOYEE_DOCUMENT_WRITE'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
