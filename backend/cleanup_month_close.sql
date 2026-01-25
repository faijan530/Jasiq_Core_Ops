-- =====================================================
-- JASIQ CoreOps: Month Close History Cleanup
-- Purpose: Keep only the latest record per month (append-only)
-- =====================================================

-- 1) Preview: Show how many rows exist per month before cleanup
SELECT
  month,
  COUNT(*) AS rows_per_month,
  MAX(created_at) AS latest_created_at,
  MIN(created_at) AS earliest_created_at
FROM month_close
GROUP BY month
ORDER BY month;

-- 2) Preview: List rows that will be KEPT (latest per month)
SELECT
  t.id,
  t.month,
  t.status,
  t.created_at
FROM (
  SELECT
    id,
    month,
    status,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY month ORDER BY created_at DESC) AS rn
  FROM month_close
) t
WHERE t.rn = 1
ORDER BY t.month;

-- 3) Preview: Count rows that will be DELETED
SELECT COUNT(*) AS rows_to_delete
FROM month_close
WHERE id NOT IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY month ORDER BY created_at DESC) AS rn
    FROM month_close
  ) t
  WHERE t.rn = 1
);

-- =====================================================
-- CLEANUP: Delete older duplicates (keep latest per month)
-- =====================================================

-- BEGIN;
-- Uncomment the line below to run the actual cleanup
-- DELETE FROM month_close
-- WHERE id NOT IN (
--   SELECT id FROM (
--     SELECT
--       id,
--       ROW_NUMBER() OVER (PARTITION BY month ORDER BY created_at DESC) AS rn
--     FROM month_close
--   ) t
--   WHERE t.rn = 1
-- );
-- COMMIT;

-- =====================================================
-- 4) Post-cleanup validation
-- =====================================================

-- Verify one row per month
SELECT
  month,
  COUNT(*) AS rows_per_month
FROM month_close
GROUP BY month
HAVING COUNT(*) > 1;

-- Show final state per month
SELECT
  month,
  status,
  closed_at,
  closed_by,
  closed_reason,
  created_at
FROM month_close
ORDER BY month DESC;
