BEGIN;

CREATE TABLE IF NOT EXISTS admin_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_name VARCHAR(50) NOT NULL CHECK (role_name IN ('COREOPS_ADMIN', 'TECH_ADMIN')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_admin_user_email ON admin_user(email);
CREATE INDEX IF NOT EXISTS idx_admin_user_active ON admin_user(is_active);

-- Seed default admin user (email: admin@coreops.dev, password: admin123)
-- Password hash for 'admin123' using bcrypt (10 rounds)
INSERT INTO admin_user (email, password_hash, role_name)
VALUES (
  'admin@coreops.dev',
  '$2b$10$MFOjKsXx5exTb9qw7hY93evF1pcb/eXBYLivsDquO3VAbX6h0rFOW',
  'COREOPS_ADMIN'
)
ON CONFLICT (email) DO NOTHING;

COMMIT;
