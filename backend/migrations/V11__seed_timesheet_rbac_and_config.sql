BEGIN;

INSERT INTO permission (id, code, description) VALUES
  ('55555555-5555-5555-5555-555555555551', 'TIMESHEET_READ', 'Read timesheets'),
  ('55555555-5555-5555-5555-555555555552', 'TIMESHEET_WORKLOG_WRITE', 'Create/update timesheet work logs'),
  ('55555555-5555-5555-5555-555555555553', 'TIMESHEET_SUBMIT', 'Submit timesheets'),
  ('55555555-5555-5555-5555-555555555554', 'TIMESHEET_APPROVE_L1', 'Approve/reject/request revision for timesheets (level 1)'),
  ('55555555-5555-5555-5555-555555555555', 'TIMESHEET_APPROVE_L2', 'Approve timesheets (level 2)'),
  ('55555555-5555-5555-5555-555555555556', 'TIMESHEET_APPROVAL_QUEUE_READ', 'List timesheets pending approval')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', p.id
FROM permission p
WHERE p.code IN (
  'TIMESHEET_READ',
  'TIMESHEET_WORKLOG_WRITE',
  'TIMESHEET_SUBMIT',
  'TIMESHEET_APPROVE_L1',
  'TIMESHEET_APPROVE_L2',
  'TIMESHEET_APPROVAL_QUEUE_READ'
)
ON CONFLICT DO NOTHING;

INSERT INTO system_config (key, value, description) VALUES
  ('TIMESHEET_ENABLED', 'false', 'Enable timesheet module'),
  ('TIMESHEET_REQUIRED_FOR_COMPANY', 'true', 'Require timesheets for COMPANY scope employees'),
  ('TIMESHEET_CYCLE', 'WEEKLY', 'Timesheet cycle: WEEKLY or MONTHLY'),
  ('TIMESHEET_MAX_HOURS_PER_DAY', '8', 'Maximum total hours allowed per day across work logs'),
  ('TIMESHEET_PROJECT_TAGGING_ENABLED', 'false', 'Enable project tagging on work logs'),
  ('TIMESHEET_APPROVAL_LEVELS', '1', 'Timesheet approval levels: 1 or 2')
ON CONFLICT (key) DO NOTHING;

COMMIT;
