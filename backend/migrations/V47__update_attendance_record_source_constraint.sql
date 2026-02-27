BEGIN;

-- Drop the old source check constraint
ALTER TABLE attendance_record 
DROP CONSTRAINT IF EXISTS attendance_record_source_check;

-- Add the new source check constraint with updated values
ALTER TABLE attendance_record 
ADD CONSTRAINT attendance_record_source_check 
CHECK (source IN ('SELF','SYSTEM','IMPORT','MANUAL'));

COMMIT;
