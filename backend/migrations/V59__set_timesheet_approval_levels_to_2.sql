BEGIN;

UPDATE system_config
SET value = '2'
WHERE key = 'TIMESHEET_APPROVAL_LEVELS'
  AND (value IS NULL OR value = '1');

COMMIT;
