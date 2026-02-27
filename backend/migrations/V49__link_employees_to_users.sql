BEGIN;

-- Link existing employees to users based on the existing user.employee_id relationship
-- Since user table already has employee_id, we need to copy that relationship back to employee.user_id

UPDATE employee 
SET user_id = u.id
FROM "user" u
WHERE u.employee_id IS NOT NULL 
  AND employee.id = u.employee_id
  AND employee.user_id IS NULL;

-- Add audit logging for the updates
INSERT INTO audit_log (
    id, 
    request_id,
    entity_type, 
    entity_id, 
    action, 
    before_data, 
    after_data, 
    actor_id,
    reason, 
    created_at
)
SELECT 
    gen_random_uuid(),
    'MIGRATION_V49',
    'EMPLOYEE',
    e.id,
    'UPDATED',
    json_build_object('user_id', NULL),
    json_build_object('user_id', e.user_id),
    '00000000-0000-0000-0000-000000000001',
    'Linked employee to user account via existing employee_id relationship',
    NOW()
FROM employee e
WHERE e.user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "user" u 
    WHERE u.employee_id = e.id 
      AND u.id = e.user_id
  );

COMMIT;
