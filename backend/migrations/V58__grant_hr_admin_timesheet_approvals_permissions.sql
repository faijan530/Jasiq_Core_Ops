BEGIN;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'HR_ADMIN'
  AND p.code IN (
    'TIMESHEET_APPROVAL_QUEUE_READ',
    'TIMESHEET_APPROVE_L2'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
