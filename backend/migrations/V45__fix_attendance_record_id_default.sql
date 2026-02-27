BEGIN;

-- Add default UUID generation to attendance_record.id
-- This fixes the null id constraint violation
ALTER TABLE attendance_record 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;
