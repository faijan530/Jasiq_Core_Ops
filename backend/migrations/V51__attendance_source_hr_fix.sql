BEGIN;

-- Fix attendance source constraint to include HR
ALTER TABLE attendance_record 
DROP CONSTRAINT IF EXISTS attendance_record_source_check;

ALTER TABLE attendance_record 
ADD CONSTRAINT attendance_record_source_check 
CHECK (source IN ('SELF','SYSTEM','HR','IMPORT','MANUAL'));

COMMIT;
