BEGIN;

-- Add missing governance permissions to HR_ADMIN role
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'GOV_DIVISION_READ',
  'GOV_MONTH_CLOSE_READ',
  'MONTH_CLOSE_MANAGE'
)
WHERE r.name = 'HR_ADMIN'
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
);

COMMIT;
