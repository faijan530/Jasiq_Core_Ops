BEGIN;

-- Ensure Leave approval workflow uses two levels (L1 -> L2) so manager approvals route to HR Admin
-- Idempotent: only updates when value is missing or set to 1
UPDATE system_config
SET value = '2'
WHERE key = 'LEAVE_APPROVAL_LEVELS'
  AND (value IS NULL OR value = '' OR value = '1');

COMMIT;
