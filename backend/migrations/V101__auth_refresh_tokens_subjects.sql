-- Extend refresh tokens to support both employee users and admin users.
-- NOTE: V100 is immutable; this migration safely evolves schema.

ALTER TABLE auth_refresh_token
  ADD COLUMN IF NOT EXISTS subject_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS subject_id UUID;

UPDATE auth_refresh_token
SET subject_type = 'USER', subject_id = user_id
WHERE subject_type IS NULL OR subject_id IS NULL;

ALTER TABLE auth_refresh_token
  ALTER COLUMN subject_type SET NOT NULL,
  ALTER COLUMN subject_id SET NOT NULL;

-- V100 required user_id (FK to "user"). For ADMIN_USER refresh tokens we must allow non-user principals.
-- Keep user_id column but make it nullable and remove the FK constraint.
ALTER TABLE auth_refresh_token
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE auth_refresh_token
  DROP CONSTRAINT IF EXISTS fk_auth_refresh_token_user;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_auth_refresh_token_subject_type'
  ) THEN
    ALTER TABLE auth_refresh_token
      ADD CONSTRAINT chk_auth_refresh_token_subject_type
      CHECK (subject_type IN ('USER','ADMIN_USER'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auth_refresh_token_subject ON auth_refresh_token(subject_type, subject_id);

-- Keep user_id for backward compatibility with existing code paths.
