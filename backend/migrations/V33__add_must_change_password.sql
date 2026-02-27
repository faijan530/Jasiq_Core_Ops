BEGIN;

ALTER TABLE IF EXISTS "user"
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_user_must_change_password ON "user"(must_change_password);

COMMIT;
