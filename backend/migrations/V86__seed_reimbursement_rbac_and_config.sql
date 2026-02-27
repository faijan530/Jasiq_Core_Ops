BEGIN;

-- Permissions
INSERT INTO permission (id, code, description) VALUES
  (gen_random_uuid(), 'REIMBURSEMENT_CREATE_SELF', 'Create reimbursement draft for self'),
  (gen_random_uuid(), 'REIMBURSEMENT_EDIT_SELF_DRAFT', 'Edit own reimbursement draft'),
  (gen_random_uuid(), 'REIMBURSEMENT_SUBMIT_SELF', 'Submit own reimbursement'),
  (gen_random_uuid(), 'REIMBURSEMENT_VIEW_SELF', 'View own reimbursements'),
  (gen_random_uuid(), 'REIMBURSEMENT_VIEW_DIVISION', 'View reimbursements in division scope'),
  (gen_random_uuid(), 'REIMBURSEMENT_APPROVE', 'Approve reimbursements'),
  (gen_random_uuid(), 'REIMBURSEMENT_REJECT', 'Reject reimbursements'),
  (gen_random_uuid(), 'REIMBURSEMENT_ADD_PAYMENT', 'Add reimbursement payments'),
  (gen_random_uuid(), 'REIMBURSEMENT_CLOSE', 'Close reimbursements')
ON CONFLICT (code) DO NOTHING;

-- System config
INSERT INTO system_config (key, value, description) VALUES
  ('REIMBURSEMENT_ENABLED', 'true', 'Enable reimbursement module'),
  ('REIMBURSEMENT_RECEIPT_REQUIRED', 'false', 'Require receipt upload before submit'),
  ('REIMBURSEMENT_MAX_AMOUNT_PER_CLAIM', '0', 'Maximum allowed reimbursement amount per claim; 0 disables limit'),
  ('REIMBURSEMENT_APPROVAL_LEVELS', '1', 'Number of approval levels for reimbursements'),
  ('REIMBURSEMENT_ALLOW_BACKDATED', 'false', 'Allow backdated reimbursement claim dates'),
  ('REIMBURSEMENT_BACKDATE_LIMIT_DAYS', '0', 'Max backdate days for reimbursement claim dates'),
  ('REIMBURSEMENT_PARTIAL_PAYMENTS_ENABLED', 'true', 'Allow partial reimbursement payments'),
  ('REIMBURSEMENT_AUTO_EXPENSE_ON', 'true', 'Auto-create approved expense when reimbursement is approved')
ON CONFLICT (key) DO NOTHING;

-- Ensure an expense category exists for reimbursements (used by reimbursement->expense adapter)
INSERT INTO expense_category (id, code, name, description, is_active, created_at, created_by, updated_at, updated_by, version)
SELECT gen_random_uuid(), 'REIMBURSEMENT', 'Reimbursement', 'Expenses created from approved reimbursements', true, NOW(), NULL, NOW(), NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM expense_category WHERE code = 'REIMBURSEMENT');

COMMIT;
