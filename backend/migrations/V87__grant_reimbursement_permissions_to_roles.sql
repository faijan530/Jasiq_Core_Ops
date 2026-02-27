BEGIN;

-- EMPLOYEE: self reimbursements
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'EMPLOYEE'
  AND p.code IN (
    'REIMBURSEMENT_CREATE_SELF',
    'REIMBURSEMENT_EDIT_SELF_DRAFT',
    'REIMBURSEMENT_SUBMIT_SELF',
    'REIMBURSEMENT_VIEW_SELF'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- MANAGER: division view + approvals
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'MANAGER'
  AND p.code IN (
    'REIMBURSEMENT_VIEW_DIVISION',
    'REIMBURSEMENT_APPROVE',
    'REIMBURSEMENT_REJECT'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- FINANCE_ADMIN: division view + settlement
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'FINANCE_ADMIN'
  AND p.code IN (
    'REIMBURSEMENT_VIEW_DIVISION',
    'REIMBURSEMENT_ADD_PAYMENT',
    'REIMBURSEMENT_CLOSE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
