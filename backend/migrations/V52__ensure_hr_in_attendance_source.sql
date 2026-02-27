BEGIN;

-- Check current constraint and ensure HR is included
ALTER TABLE attendance_record 
DROP CONSTRAINT IF EXISTS attendance_record_source_check;

-- Add constraint with all valid sources including HR
ALTER TABLE attendance_record 
ADD CONSTRAINT attendance_record_source_check 
CHECK (source IN ('SELF','SYSTEM','HR','IMPORT','MANUAL'));

COMMIT;
