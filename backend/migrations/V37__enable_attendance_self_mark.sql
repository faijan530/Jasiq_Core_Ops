-- Enable attendance self-marking
UPDATE system_config 
SET value = 'true' 
WHERE key = 'ATTENDANCE_SELF_MARK_ENABLED';
