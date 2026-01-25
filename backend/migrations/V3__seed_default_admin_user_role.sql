BEGIN;

ALTER TABLE user_role DROP CONSTRAINT IF EXISTS user_role_pkey;

ALTER TABLE user_role ADD COLUMN IF NOT EXISTS id UUID;
UPDATE user_role SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE user_role ALTER COLUMN id SET NOT NULL;
ALTER TABLE user_role ADD CONSTRAINT user_role_pkey PRIMARY KEY (id);

ALTER TABLE user_role ALTER COLUMN division_id DROP NOT NULL;
UPDATE user_role SET division_id = NULL WHERE scope = 'COMPANY';

ALTER TABLE user_role DROP CONSTRAINT IF EXISTS user_role_scope_division_check;
ALTER TABLE user_role
  ADD CONSTRAINT user_role_scope_division_check
  CHECK (
    (scope = 'COMPANY' AND division_id IS NULL)
    OR
    (scope = 'DIVISION' AND division_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_role_company
  ON user_role(user_id, role_id)
  WHERE scope = 'COMPANY' AND division_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_role_division
  ON user_role(user_id, role_id, division_id)
  WHERE scope = 'DIVISION' AND division_id IS NOT NULL;

INSERT INTO user_role (id, user_id, role_id, scope, division_id)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'COMPANY',
  NULL
)
ON CONFLICT DO NOTHING;

COMMIT;
