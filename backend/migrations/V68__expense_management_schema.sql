BEGIN;

CREATE TABLE IF NOT EXISTS expense_category (
  id UUID PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_exp_cat_active ON expense_category(is_active);

CREATE TABLE IF NOT EXISTS expense (
  id UUID PRIMARY KEY,
  expense_date DATE NOT NULL,
  category_id UUID NOT NULL REFERENCES expense_category(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  division_id UUID NULL REFERENCES division(id),
  project_id UUID NULL REFERENCES project(id),
  paid_by_method VARCHAR(20) NOT NULL CHECK (paid_by_method IN ('BANK_TRANSFER','UPI','CASH','CARD','OTHER')),
  vendor_name VARCHAR(200) NULL,
  is_reimbursement BOOLEAN NOT NULL DEFAULT false,
  employee_id UUID NULL REFERENCES employee(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','PAID','CLOSED')),
  submitted_at TIMESTAMP NULL,
  submitted_by UUID NULL,
  approved_at TIMESTAMP NULL,
  approved_by UUID NULL,
  rejected_at TIMESTAMP NULL,
  rejected_by UUID NULL,
  decision_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_expense_date ON expense(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_status ON expense(status);
CREATE INDEX IF NOT EXISTS idx_expense_division ON expense(division_id);
CREATE INDEX IF NOT EXISTS idx_expense_category ON expense(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_employee ON expense(employee_id);

CREATE TABLE IF NOT EXISTS expense_receipt (
  id UUID PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES expense(id),
  file_name VARCHAR(200) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  file_size BIGINT NOT NULL,
  storage_key VARCHAR(400) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_by UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_exp_receipt_exp ON expense_receipt(expense_id);

CREATE TABLE IF NOT EXISTS expense_payment (
  id UUID PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES expense(id),
  paid_amount NUMERIC(12,2) NOT NULL CHECK (paid_amount >= 0),
  paid_at TIMESTAMP NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('BANK_TRANSFER','UPI','CASH','CARD','OTHER')),
  reference_id VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_exp_payment_exp ON expense_payment(expense_id);

COMMIT;
