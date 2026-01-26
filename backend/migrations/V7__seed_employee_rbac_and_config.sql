BEGIN;

INSERT INTO permission (id, code, description) VALUES
  ('33333333-3333-3333-3333-333333333331', 'EMPLOYEE_READ', 'Read employees'),
  ('33333333-3333-3333-3333-333333333332', 'EMPLOYEE_WRITE', 'Create/update employees and lifecycle'),
  ('33333333-3333-3333-3333-333333333333', 'EMPLOYEE_COMPENSATION_WRITE', 'Manage employee compensation versions'),
  ('33333333-3333-3333-3333-333333333334', 'EMPLOYEE_DOCUMENT_WRITE', 'Manage employee documents')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', p.id
FROM permission p
WHERE p.code IN (
  'EMPLOYEE_READ',
  'EMPLOYEE_WRITE',
  'EMPLOYEE_COMPENSATION_WRITE',
  'EMPLOYEE_DOCUMENT_WRITE'
)
ON CONFLICT DO NOTHING;

INSERT INTO system_config (key, value, description) VALUES
  ('EMPLOYEE_ENABLED', 'true', 'Enable employee module')
ON CONFLICT (key) DO NOTHING;

COMMIT;
