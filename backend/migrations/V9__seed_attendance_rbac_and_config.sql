BEGIN;

INSERT INTO permission (id, code, description) VALUES
  ('44444444-4444-4444-4444-444444444441', 'ATTENDANCE_READ', 'Read attendance records'),
  ('44444444-4444-4444-4444-444444444442', 'ATTENDANCE_WRITE', 'Mark attendance records'),
  ('44444444-4444-4444-4444-444444444443', 'ATTENDANCE_BULK_WRITE', 'Bulk mark attendance records'),
  ('44444444-4444-4444-4444-444444444444', 'ATTENDANCE_OVERRIDE', 'Override existing attendance records')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', p.id
FROM permission p
WHERE p.code IN (
  'ATTENDANCE_READ',
  'ATTENDANCE_WRITE',
  'ATTENDANCE_BULK_WRITE',
  'ATTENDANCE_OVERRIDE'
)
ON CONFLICT DO NOTHING;

INSERT INTO system_config (key, value, description) VALUES
  ('ATTENDANCE_ENABLED', 'true', 'Enable attendance module'),
  ('ATTENDANCE_SELF_MARK_ENABLED', 'false', 'Allow self-marking of attendance')
ON CONFLICT (key) DO NOTHING;

COMMIT;
