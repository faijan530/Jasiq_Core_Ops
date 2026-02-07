BEGIN;

-- Simple fix: For all OPEN rows with NULL opened_by/opened_at, 
-- set opened_by to the same as closed_by (if available) or use created_at timestamp
UPDATE month_close 
SET opened_by = COALESCE(closed_by, 'd670de8e-296f-4a79-ac2f-53682a23f9df'),
    opened_at = COALESCE(created_at, NOW())
WHERE status = 'OPEN'
  AND (opened_by IS NULL OR opened_at IS NULL);

COMMIT;
