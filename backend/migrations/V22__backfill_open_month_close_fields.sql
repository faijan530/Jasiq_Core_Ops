BEGIN;

-- Update existing OPEN rows to set opened_by and opened_at
-- For rows that are OPEN but have NULL opened_by/opened_at,
-- we'll use the audit log to find who opened them

UPDATE month_close 
SET opened_by = audit.actor_id,
    opened_at = audit.created_at
FROM audit_log audit
WHERE month_close.status = 'OPEN'
  AND month_close.opened_by IS NULL
  AND month_close.opened_at IS NULL
  AND audit.entity_type = 'MONTH_CLOSE'
  AND audit.entity_id = month_close.id
  AND audit.action = 'OPEN';

-- For any remaining OPEN rows without audit info, set a default
UPDATE month_close 
SET opened_by = closed_by,
    opened_at = created_at
WHERE status = 'OPEN'
  AND opened_by IS NULL
  AND opened_at IS NULL;

COMMIT;
