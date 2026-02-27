BEGIN;

-- Add default version to attendance_record.version
ALTER TABLE attendance_record 
ALTER COLUMN version SET DEFAULT 1;

COMMIT;
