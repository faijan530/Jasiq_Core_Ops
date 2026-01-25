BEGIN;

-- month_close is append-only history. Remove uniqueness so multiple rows per (month, scope) can exist.
ALTER TABLE month_close
  DROP CONSTRAINT IF EXISTS month_close_month_scope_key;

-- Keep an index for fast lookups by month/scope.
CREATE INDEX IF NOT EXISTS idx_month_close_month_scope ON month_close(month, scope);

COMMIT;
