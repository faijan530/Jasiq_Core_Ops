BEGIN;

-- month_close is append-only history and needs a deterministic ordering column.
ALTER TABLE month_close
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Best-effort backfill for existing rows.
UPDATE month_close
SET created_at = COALESCE(created_at, closed_at, NOW())
WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_month_close_created_at ON month_close(created_at);

COMMIT;
