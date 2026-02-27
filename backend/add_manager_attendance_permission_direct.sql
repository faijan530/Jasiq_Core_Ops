-- Direct SQL to add ATTENDANCE_VIEW_TEAM permission to MANAGER role
-- Run this directly in your database console

-- First, check if the permission already exists
SELECT 
    r.name as role_name, 
    p.code as permission_code,
    CASE 
        WHEN rp.role_id IS NOT NULL THEN 'ASSIGNED'
        ELSE 'NOT ASSIGNED'
    END as status
FROM role r
CROSS JOIN permission p
LEFT JOIN role_permission rp ON r.id = rp.role_id AND p.id = rp.permission_id
WHERE r.name = 'MANAGER' AND p.code = 'ATTENDANCE_VIEW_TEAM';

-- Add the permission if not already assigned
INSERT INTO role_permission (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM role r, permission p
WHERE r.name = 'MANAGER' 
  AND p.code = 'ATTENDANCE_VIEW_TEAM'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Verify the permission was added
SELECT 
    r.name as role_name, 
    p.code as permission_code,
    'ASSIGNED' as status
FROM role_permission rp
JOIN role r ON rp.role_id = r.id
JOIN permission p ON rp.permission_id = p.id
WHERE r.name = 'MANAGER' AND p.code = 'ATTENDANCE_VIEW_TEAM';
