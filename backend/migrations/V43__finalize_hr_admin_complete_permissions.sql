BEGIN;

-- Finalize HR_ADMIN complete permission set
-- Ensure all required HR_ADMIN permissions are present (idempotent)

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'HR_ADMIN'
AND p.code IN (
  -- Employee permissions
  'EMPLOYEE_READ',
  'EMPLOYEE_WRITE',
  
  -- Attendance permissions
  'ATTENDANCE_VIEW_TEAM',
  'ATTENDANCE_CORRECT',
  
  -- Timesheet permissions
  'TIMESHEET_VIEW_TEAM',
  
  -- Leave permissions
  'LEAVE_REQUEST_READ',
  'LEAVE_APPROVE_L2',
  'LEAVE_BALANCE_GRANT',
  'LEAVE_TYPE_READ',
  'LEAVE_TYPE_WRITE',
  'LEAVE_MONTH_CLOSE_OVERRIDE',
  
  -- Governance permissions
  'GOV_DIVISION_READ',
  'GOV_MONTH_CLOSE_READ'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
