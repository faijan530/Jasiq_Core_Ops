CREATE TABLE IF NOT EXISTS auth_refresh_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_id UUID NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  replaced_by_token_id UUID NULL,
  user_agent TEXT NULL,
  ip TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_token_user_id ON auth_refresh_token(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_token_family_id ON auth_refresh_token(family_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_token_expires_at ON auth_refresh_token(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_refresh_token_hash ON auth_refresh_token(token_hash);

ALTER TABLE auth_refresh_token
  ADD CONSTRAINT fk_auth_refresh_token_user FOREIGN KEY (user_id)
  REFERENCES "user"(id)
  ON DELETE CASCADE;

ALTER TABLE auth_refresh_token
  ADD CONSTRAINT fk_auth_refresh_token_replaced_by FOREIGN KEY (replaced_by_token_id)
  REFERENCES auth_refresh_token(id)
  ON DELETE SET NULL;
