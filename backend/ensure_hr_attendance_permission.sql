-- Check and add ATTENDANCE_VIEW_TEAM permission to HR_ADMIN role
-- This script ensures HR can view team attendance

DO $$
DECLARE
    hr_role_id UUID;
    permission_id UUID;
    existing_count INTEGER;
BEGIN
    -- Get HR_ADMIN role ID
    SELECT id INTO hr_role_id FROM role WHERE name = 'HR_ADMIN';
    
    IF hr_role_id IS NULL THEN
        RAISE EXCEPTION 'HR_ADMIN role not found';
    END IF;
    
    -- Get ATTENDANCE_VIEW_TEAM permission ID
    SELECT id INTO permission_id FROM permission WHERE code = 'ATTENDANCE_VIEW_TEAM';
    
    IF permission_id IS NULL THEN
        RAISE EXCEPTION 'ATTENDANCE_VIEW_TEAM permission not found';
    END IF;
    
    -- Check if permission is already assigned
    SELECT COUNT(*) INTO existing_count 
    FROM role_permission 
    WHERE role_id = hr_role_id AND permission_id = permission_id;
    
    -- Add permission if not already assigned
    IF existing_count = 0 THEN
        INSERT INTO role_permission (role_id, permission_id, created_at, updated_at)
        VALUES (hr_role_id, permission_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        
        RAISE NOTICE 'Successfully added ATTENDANCE_VIEW_TEAM permission to HR_ADMIN role';
    ELSE
        RAISE NOTICE 'HR_ADMIN already has ATTENDANCE_VIEW_TEAM permission';
    END IF;
END $$;
