BEGIN;

-- Grant ATTENDANCE_MARK_SELF to roles that need to mark theri own attendance
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name IN ('MANAGER', 'HR_ADMIN', 'FINANCE_ADMIN', 'FOUNDER')
AND p.code = 'ATTENDANCE_MARK_SELF'
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
