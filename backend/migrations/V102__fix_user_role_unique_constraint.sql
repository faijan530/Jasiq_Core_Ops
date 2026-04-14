BEGIN;

-- Add unique constraint on (user_id, role_id, scope, division_id) to support ON CONFLICT
-- This matches the existing primary key structure but creates a proper unique constraint
ALTER TABLE user_role 
ADD CONSTRAINT user_role_user_id_role_id_scope_division_id_key 
UNIQUE (user_id, role_id, scope, division_id);

COMMIT;
