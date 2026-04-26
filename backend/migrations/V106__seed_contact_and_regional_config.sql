BEGIN;

INSERT INTO system_config (key, value, description) VALUES
  ('ORGANIZATION_NAME', 'CoreOps', 'Official name of the organization'),
  ('CURRENCY', 'USD', 'System-wide base currency code (e.g. USD, INR)'),
  ('HR_SUPPORT_EMAIL', 'hr@example.com', 'Contact email for HR support'),
  ('FINANCE_SUPPORT_EMAIL', 'finance@example.com', 'Contact email for finance and payroll support'),
  ('IT_HELPDESK_EXT', '987', 'Extension number for internal IT helpdesk')
ON CONFLICT (key) DO NOTHING;

COMMIT;
