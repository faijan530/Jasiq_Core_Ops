BEGIN;

-- Ensure Expense permissions exist (idempotent)
INSERT INTO permission (id, code, description)
SELECT gen_random_uuid(), v.code, v.description
FROM (
  VALUES
    ('EXPENSE_CATEGORY_READ', 'Read expense categories'),
    ('EXPENSE_CATEGORY_WRITE', 'Create/update expense categories'),
    ('EXPENSE_CREATE', 'Create expense drafts'),
    ('EXPENSE_UPDATE', 'Update expense drafts'),
    ('EXPENSE_READ', 'Read expenses'),
    ('EXPENSE_SUBMIT', 'Submit expense for approval'),
    ('EXPENSE_APPROVE', 'Approve expense'),
    ('EXPENSE_REJECT', 'Reject expense'),
    ('EXPENSE_MARK_PAID', 'Mark expense paid (append-only payments)'),
    ('EXPENSE_RECEIPT_UPLOAD', 'Upload expense receipt metadata'),
    ('EXPENSE_RECEIPT_READ', 'Read/download expense receipts'),
    ('EXPENSE_MONTH_CLOSE_OVERRIDE', 'Override month close for expenses')
) AS v(code, description)
WHERE NOT EXISTS (SELECT 1 FROM permission p WHERE p.code = v.code);

-- Grant full expense permissions to Finance roles (company scope handled by user_role, not role_permission)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'EXPENSE_CATEGORY_READ','EXPENSE_CATEGORY_WRITE',
  'EXPENSE_CREATE','EXPENSE_UPDATE','EXPENSE_READ',
  'EXPENSE_SUBMIT','EXPENSE_APPROVE','EXPENSE_REJECT',
  'EXPENSE_MARK_PAID','EXPENSE_RECEIPT_UPLOAD','EXPENSE_RECEIPT_READ',
  'EXPENSE_MONTH_CLOSE_OVERRIDE'
)
WHERE r.name IN ('FINANCE_ADMIN', 'FINANCE_HEAD')
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Grant employee reimbursement flow permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'EXPENSE_CATEGORY_READ',
  'EXPENSE_CREATE','EXPENSE_UPDATE','EXPENSE_READ',
  'EXPENSE_SUBMIT',
  'EXPENSE_RECEIPT_UPLOAD','EXPENSE_RECEIPT_READ'
)
WHERE r.name = 'EMPLOYEE'
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Grant manager approval flow permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'EXPENSE_READ',
  'EXPENSE_APPROVE','EXPENSE_REJECT',
  'EXPENSE_RECEIPT_READ'
)
WHERE r.name = 'MANAGER'
AND NOT EXISTS (
  SELECT 1 FROM role_permission rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
