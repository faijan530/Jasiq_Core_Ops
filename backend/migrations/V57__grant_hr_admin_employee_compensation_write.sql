-- Grant EMPLOYEE_COMPENSATION_WRITE to HR_ADMIN (idempotent)

-- Ensure permission exists
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'EMPLOYEE_COMPENSATION_WRITE', 'Write employee compensation'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'EMPLOYEE_COMPENSATION_WRITE');

-- Attach permission to HR_ADMIN
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'HR_ADMIN'
  AND p.code = 'EMPLOYEE_COMPENSATION_WRITE'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
