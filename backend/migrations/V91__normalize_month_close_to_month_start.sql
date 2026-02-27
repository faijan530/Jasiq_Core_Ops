BEGIN;

-- Feature 11 requires month_close.month to store the first day of the month (YYYY-MM-01).
-- Normalize existing data to month-start while keeping one row per (month, scope).
UPDATE month_close
SET month = date_trunc('month', month)::date
WHERE month IS NOT NULL
  AND month <> date_trunc('month', month)::date;

COMMIT;
