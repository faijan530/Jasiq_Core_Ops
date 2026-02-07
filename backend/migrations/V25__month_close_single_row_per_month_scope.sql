BEGIN;

-- Enforce one row per (month, scope) to match implicit-OPEN / exceptional-state model.
-- Deduplicate existing data by keeping the most recent row per (month, scope).
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (PARTITION BY month::date, scope ORDER BY created_at DESC, id DESC) AS rn
  FROM month_close
)
DELETE FROM month_close mc
USING ranked r
WHERE mc.ctid = r.ctid
  AND r.rn > 1;

ALTER TABLE month_close
  ADD CONSTRAINT month_close_month_scope_key UNIQUE (month, scope);

COMMIT;
