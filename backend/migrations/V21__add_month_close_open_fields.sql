BEGIN;

-- Add opened_at and opened_by columns to month_close table
ALTER TABLE month_close
  ADD COLUMN opened_at TIMESTAMP,
  ADD COLUMN opened_by UUID;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_month_close_opened_by ON month_close(opened_by);
CREATE INDEX IF NOT EXISTS idx_month_close_opened_at ON month_close(opened_at);

COMMIT;
