BEGIN;

INSERT INTO permission (id, code, description) VALUES
  (gen_random_uuid(), 'INCOME_CATEGORY_READ', 'Read income categories'),
  (gen_random_uuid(), 'INCOME_CATEGORY_WRITE', 'Create/update income categories'),
  (gen_random_uuid(), 'INCOME_CLIENT_READ', 'Read clients'),
  (gen_random_uuid(), 'INCOME_CLIENT_WRITE', 'Create/update clients'),
  (gen_random_uuid(), 'INCOME_CREATE', 'Create income drafts'),
  (gen_random_uuid(), 'INCOME_UPDATE', 'Update income drafts'),
  (gen_random_uuid(), 'INCOME_READ', 'Read income'),
  (gen_random_uuid(), 'INCOME_SUBMIT', 'Submit income for approval'),
  (gen_random_uuid(), 'INCOME_APPROVE', 'Approve income'),
  (gen_random_uuid(), 'INCOME_REJECT', 'Reject income'),
  (gen_random_uuid(), 'INCOME_MARK_PAID', 'Mark income paid (append-only payments)'),
  (gen_random_uuid(), 'INCOME_DOCUMENT_UPLOAD', 'Upload income documents'),
  (gen_random_uuid(), 'INCOME_DOCUMENT_READ', 'Read/download income documents'),
  (gen_random_uuid(), 'INCOME_MONTH_CLOSE_OVERRIDE', 'Override month close for income')
ON CONFLICT (code) DO NOTHING;

INSERT INTO system_config (key, value, description) VALUES
  ('INCOME_ENABLED', 'true', 'Enable income module'),
  ('INCOME_APPROVAL_LEVELS', '1', 'Number of approval levels for income'),
  ('INCOME_INVOICE_REQUIRED', 'false', 'Invoice number required for income'),
  ('INCOME_ALLOW_BACKDATED', 'false', 'Allow backdated income'),
  ('INCOME_BACKDATE_LIMIT_DAYS', '0', 'Max backdate days for income'),
  ('INCOME_CLIENTS_ENABLED', 'true', 'Enable clients for income'),
  ('INCOME_INVOICE_SERIES_ENABLED', 'false', 'Enable invoice series generation'),
  ('INCOME_PARTIAL_PAYMENTS_ENABLED', 'true', 'Allow partial payments')
ON CONFLICT (key) DO NOTHING;

COMMIT;
