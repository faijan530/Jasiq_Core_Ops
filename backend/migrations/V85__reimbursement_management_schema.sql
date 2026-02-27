BEGIN;

CREATE TABLE IF NOT EXISTS reimbursement (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id),
  claim_date DATE NOT NULL,
  claim_month DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('COMPANY','DIVISION')),
  division_id UUID NULL REFERENCES division(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','PAID','CLOSED')),
  decision_reason TEXT NULL,
  approved_at TIMESTAMP NULL,
  approved_by UUID NULL,
  rejected_at TIMESTAMP NULL,
  rejected_by UUID NULL,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_amount NUMERIC(12,2) NOT NULL CHECK (due_amount >= 0),
  linked_expense_id UUID NULL,
  submitted_at TIMESTAMP NULL,
  submitted_by UUID NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_employee ON reimbursement(employee_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_claim_month ON reimbursement(claim_month);
CREATE INDEX IF NOT EXISTS idx_reimbursement_status ON reimbursement(status);
CREATE INDEX IF NOT EXISTS idx_reimbursement_division ON reimbursement(division_id);

CREATE TABLE IF NOT EXISTS reimbursement_receipt (
  id UUID PRIMARY KEY,
  reimbursement_id UUID NOT NULL REFERENCES reimbursement(id),
  file_name VARCHAR(200) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  file_size BIGINT NOT NULL,
  storage_key VARCHAR(400) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_by UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_receipt_reimb ON reimbursement_receipt(reimbursement_id);

CREATE TABLE IF NOT EXISTS reimbursement_payment (
  id UUID PRIMARY KEY,
  reimbursement_id UUID NOT NULL REFERENCES reimbursement(id),
  paid_amount NUMERIC(12,2) NOT NULL CHECK (paid_amount >= 0),
  paid_at TIMESTAMP NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('BANK_TRANSFER','UPI','CASH','OTHER')),
  reference_id VARCHAR(120) NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_payment_reimb ON reimbursement_payment(reimbursement_id);

COMMIT;
