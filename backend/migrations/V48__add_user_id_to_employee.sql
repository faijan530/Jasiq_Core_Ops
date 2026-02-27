BEGIN;

-- Add user_id column to employee table
ALTER TABLE employee 
ADD COLUMN user_id UUID;

-- Add unique constraint on user_id (but allow nulls initially for safety)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_user_id_unique ON employee(user_id) WHERE user_id IS NOT NULL;

-- Add comment to document the new column
COMMENT ON COLUMN employee.user_id IS 'Reference to the user account UUID linked to this employee';

COMMIT;
