BEGIN;

-- Ensure SUPER_ADMIN role exists
INSERT INTO role (id, name, description)
SELECT gen_random_uuid(), 'SUPER_ADMIN', 'Super administrator role with full system access.'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'SUPER_ADMIN');

-- Ensure SYSTEM_FULL_ACCESS permission exists
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), 'SYSTEM_FULL_ACCESS', 'Full system access'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'SYSTEM_FULL_ACCESS');

-- Ensure SUPER_ADMIN has SYSTEM_FULL_ACCESS
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'SUPER_ADMIN'
  AND p.code = 'SYSTEM_FULL_ACCESS'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
