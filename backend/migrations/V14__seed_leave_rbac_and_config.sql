BEGIN;

INSERT INTO permission (id, code, description) VALUES
  ('11111111-1111-1111-1111-111111111201', 'LEAVE_TYPE_READ', 'Read leave types'),
  ('11111111-1111-1111-1111-111111111202', 'LEAVE_TYPE_WRITE', 'Create/update leave types'),
  ('11111111-1111-1111-1111-111111111203', 'LEAVE_BALANCE_READ', 'Read leave balances'),
  ('11111111-1111-1111-1111-111111111204', 'LEAVE_BALANCE_GRANT', 'Grant leave balances'),
  ('11111111-1111-1111-1111-111111111205', 'LEAVE_REQUEST_READ', 'Read leave requests'),
  ('11111111-1111-1111-1111-111111111206', 'LEAVE_REQUEST_CREATE', 'Create leave requests'),
  ('11111111-1111-1111-1111-111111111207', 'LEAVE_REQUEST_CANCEL', 'Cancel leave requests'),
  ('11111111-1111-1111-1111-111111111208', 'LEAVE_APPROVE_L1', 'Approve/reject leave requests (L1)'),
  ('11111111-1111-1111-1111-111111111209', 'LEAVE_APPROVE_L2', 'Approve/reject leave requests (L2)'),
  ('11111111-1111-1111-1111-111111111210', 'LEAVE_ATTACHMENT_UPLOAD', 'Upload leave request attachments'),
  ('11111111-1111-1111-1111-111111111211', 'LEAVE_ATTACHMENT_READ', 'List/download leave request attachments')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', p.id
FROM permission p
WHERE p.code IN (
  'LEAVE_TYPE_READ','LEAVE_TYPE_WRITE',
  'LEAVE_BALANCE_READ','LEAVE_BALANCE_GRANT',
  'LEAVE_REQUEST_READ','LEAVE_REQUEST_CREATE','LEAVE_REQUEST_CANCEL',
  'LEAVE_APPROVE_L1','LEAVE_APPROVE_L2',
  'LEAVE_ATTACHMENT_UPLOAD','LEAVE_ATTACHMENT_READ'
)
ON CONFLICT DO NOTHING;

INSERT INTO system_config (key, value, description) VALUES
  ('LEAVE_ENABLED', 'true', 'Enable leave management module'),
  ('LEAVE_APPROVAL_LEVELS', '1', 'Leave approvals required: 1 or 2 levels'),
  ('LEAVE_ALLOW_HALF_DAY', 'true', 'Allow half-day leave requests'),
  ('LEAVE_ALLOW_BACKDATED_REQUESTS', 'false', 'Allow backdated leave requests'),
  ('LEAVE_BACKDATE_LIMIT_DAYS', '30', 'Max backdate days if enabled'),
  ('LEAVE_ATTACHMENTS_ENABLED', 'false', 'Enable leave request attachments')
ON CONFLICT (key) DO NOTHING;

COMMIT;
