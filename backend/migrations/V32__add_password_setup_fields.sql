BEGIN;

ALTER TABLE IF EXISTS "user"
  ADD COLUMN IF NOT EXISTS password_setup_token TEXT,
  ADD COLUMN IF NOT EXISTS password_setup_expiry TIMESTAMP,
  ADD COLUMN IF NOT EXISTS account_activated BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_password_setup_token ON "user"(password_setup_token) WHERE password_setup_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_password_setup_expiry ON "user"(password_setup_expiry);

COMMIT;
