BEGIN;

INSERT INTO permission (id, code, description) VALUES
  ('11111111-1111-1111-1111-111111111212', 'LEAVE_MONTH_CLOSE_OVERRIDE', 'Override month close for leave operations')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', p.id
FROM permission p
WHERE p.code IN ('LEAVE_MONTH_CLOSE_OVERRIDE')
ON CONFLICT DO NOTHING;

COMMIT;
