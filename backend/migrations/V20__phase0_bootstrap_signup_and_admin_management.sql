BEGIN;

-- Extend allowed roles for admin_user
ALTER TABLE admin_user DROP CONSTRAINT IF EXISTS admin_user_role_name_check;
ALTER TABLE admin_user
  ADD CONSTRAINT admin_user_role_name_check
  CHECK (role_name IN ('COREOPS_ADMIN', 'TECH_ADMIN', 'SUPER_ADMIN', 'ADMIN'));

-- New permission for Phase 0 admin management
INSERT INTO permission (id, code, description) VALUES
  ('11111111-1111-1111-1111-111111111130', 'AUTH_ADMIN_MANAGE', 'Create admins / bootstrap super admin')
ON CONFLICT (code) DO NOTHING;

-- Seed roles
INSERT INTO role (id, name, description) VALUES
  ('22222222-2222-2222-2222-222222222230', 'SUPER_ADMIN', 'System super administrator'),
  ('22222222-2222-2222-2222-222222222231', 'ADMIN', 'System administrator')
ON CONFLICT (name) DO NOTHING;

-- Copy permissions from COREOPS_ADMIN to SUPER_ADMIN and ADMIN
INSERT INTO role_permission (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222230', rp.permission_id
FROM role_permission rp
WHERE rp.role_id = '22222222-2222-2222-2222-222222222222'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222231', rp.permission_id
FROM role_permission rp
WHERE rp.role_id = '22222222-2222-2222-2222-222222222222'
ON CONFLICT DO NOTHING;

-- Add admin management permission to COREOPS_ADMIN, SUPER_ADMIN, ADMIN
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code = 'AUTH_ADMIN_MANAGE'
WHERE r.name IN ('COREOPS_ADMIN', 'SUPER_ADMIN', 'ADMIN')
ON CONFLICT DO NOTHING;

COMMIT;
