BEGIN;

-- Ensure HR_ADMIN has required core permissions (idempotent)

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'HR_ADMIN'
AND p.code IN (
  'EMPLOYEE_READ',
  'EMPLOYEE_WRITE',
  'EMPLOYEE_EDIT',
  'ATTENDANCE_VIEW_TEAM',
  'DIVISION_READ',
  'PROJECT_READ',
  'LEAVE_REQUEST_READ',
  'LEAVE_APPROVE_L2',
  'LEAVE_BALANCE_GRANT',
  'LEAVE_MONTH_CLOSE_OVERRIDE',
  'LEAVE_TYPE_READ'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
