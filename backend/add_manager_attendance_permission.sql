-- Add ATTENDANCE_VIEW_TEAM permission to MANAGER role
-- This allows Managers to view team attendance

DO $$
DECLARE
    manager_role_id UUID;
    permission_id UUID;
    existing_count INTEGER;
BEGIN
    -- Get MANAGER role ID
    SELECT id INTO manager_role_id FROM role WHERE name = 'MANAGER';
    
    IF manager_role_id IS NULL THEN
        RAISE EXCEPTION 'MANAGER role not found';
    END IF;
    
    -- Get ATTENDANCE_VIEW_TEAM permission ID
    SELECT id INTO permission_id FROM permission WHERE code = 'ATTENDANCE_VIEW_TEAM';
    
    IF permission_id IS NULL THEN
        RAISE EXCEPTION 'ATTENDANCE_VIEW_TEAM permission not found';
    END IF;
    
    -- Check if permission is already assigned
    SELECT COUNT(*) INTO existing_count 
    FROM role_permission 
    WHERE role_id = manager_role_id AND permission_id = permission_id;
    
    -- Add permission if not already assigned
    IF existing_count = 0 THEN
        INSERT INTO role_permission (role_id, permission_id, created_at, updated_at)
        VALUES (manager_role_id, permission_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        
        RAISE NOTICE 'Successfully added ATTENDANCE_VIEW_TEAM permission to MANAGER role';
    ELSE
        RAISE NOTICE 'MANAGER already has ATTENDANCE_VIEW_TEAM permission';
    END IF;
END $$;
