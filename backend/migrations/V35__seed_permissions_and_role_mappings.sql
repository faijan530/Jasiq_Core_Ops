BEGIN;

-- Ensure UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- STEP 2 — Seed Core Permissions (insert only if missing)

-- EMPLOYEE self permissions
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'PROFILE_VIEW_SELF', 'View own profile'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'PROFILE_VIEW_SELF');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'ATTENDANCE_VIEW_SELF', 'View own attendance'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'ATTENDANCE_VIEW_SELF');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'ATTENDANCE_MARK_SELF', 'Mark own attendance'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'ATTENDANCE_MARK_SELF');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'LEAVE_APPLY_SELF', 'Apply leave (self)'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'LEAVE_APPLY_SELF');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'LEAVE_VIEW_SELF', 'View own leave'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'LEAVE_VIEW_SELF');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'TIMESHEET_SUBMIT_SELF', 'Submit own timesheet'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'TIMESHEET_SUBMIT_SELF');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'TIMESHEET_VIEW_SELF', 'View own timesheet'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'TIMESHEET_VIEW_SELF');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'PAYSLIP_VIEW_SELF', 'View own payslip'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'PAYSLIP_VIEW_SELF');

-- HR permissions
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'EMPLOYEE_CREATE', 'Create employees'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'EMPLOYEE_CREATE');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'EMPLOYEE_EDIT', 'Edit employees'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'EMPLOYEE_EDIT');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'LEAVE_OVERRIDE', 'Override leave before month close'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'LEAVE_OVERRIDE');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'ATTENDANCE_CORRECT', 'Correct attendance before close'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'ATTENDANCE_CORRECT');

-- Manager permissions
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'LEAVE_APPROVE_TEAM', 'Approve team leave'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'LEAVE_APPROVE_TEAM');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'TIMESHEET_APPROVE_TEAM', 'Approve team timesheets'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'TIMESHEET_APPROVE_TEAM');

-- Finance permissions
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'PAYROLL_GENERATE', 'Generate payroll'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'PAYROLL_GENERATE');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'PAYROLL_LOCK', 'Lock payroll'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'PAYROLL_LOCK');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'PAYROLL_MARK_PAID', 'Mark payroll as paid'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'PAYROLL_MARK_PAID');

INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'MONTH_CLOSE_EXECUTE', 'Execute month close'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'MONTH_CLOSE_EXECUTE');

-- Super Admin full access
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'SYSTEM_FULL_ACCESS', 'Full system access'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'SYSTEM_FULL_ACCESS');

-- STEP 3 — Map Permissions to Roles (insert only if missing)

-- EMPLOYEE mapping
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'EMPLOYEE'
AND p.code IN (
  'PROFILE_VIEW_SELF',
  'ATTENDANCE_VIEW_SELF',
  'ATTENDANCE_MARK_SELF',
  'LEAVE_APPLY_SELF',
  'LEAVE_VIEW_SELF',
  'TIMESHEET_SUBMIT_SELF',
  'TIMESHEET_VIEW_SELF',
  'PAYSLIP_VIEW_SELF'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- HR_ADMIN mapping
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'HR_ADMIN'
AND p.code IN (
  'EMPLOYEE_CREATE',
  'EMPLOYEE_EDIT',
  'LEAVE_OVERRIDE',
  'ATTENDANCE_CORRECT',
  'PROFILE_VIEW_SELF',
  'ATTENDANCE_VIEW_SELF',
  'LEAVE_VIEW_SELF',
  'TIMESHEET_VIEW_SELF',
  'PAYSLIP_VIEW_SELF'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- MANAGER mapping
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'MANAGER'
AND p.code IN (
  'LEAVE_APPROVE_TEAM',
  'TIMESHEET_APPROVE_TEAM',
  'PROFILE_VIEW_SELF',
  'ATTENDANCE_VIEW_SELF',
  'LEAVE_VIEW_SELF',
  'TIMESHEET_VIEW_SELF',
  'PAYSLIP_VIEW_SELF'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- FINANCE_ADMIN mapping
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'FINANCE_ADMIN'
AND p.code IN (
  'PAYROLL_GENERATE',
  'PAYROLL_LOCK',
  'PAYROLL_MARK_PAID',
  'MONTH_CLOSE_EXECUTE',
  'PROFILE_VIEW_SELF',
  'ATTENDANCE_VIEW_SELF',
  'LEAVE_VIEW_SELF',
  'TIMESHEET_VIEW_SELF',
  'PAYSLIP_VIEW_SELF'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- FOUNDER mapping (read-only permissions)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'FOUNDER'
AND p.code IN (
  'PROFILE_VIEW_SELF',
  'ATTENDANCE_VIEW_SELF',
  'LEAVE_VIEW_SELF',
  'TIMESHEET_VIEW_SELF',
  'PAYSLIP_VIEW_SELF'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- SUPER_ADMIN gets SYSTEM_FULL_ACCESS
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'SUPER_ADMIN'
AND p.code = 'SYSTEM_FULL_ACCESS'
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
