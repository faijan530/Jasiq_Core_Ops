BEGIN;

CREATE TABLE IF NOT EXISTS payroll_run (
  id UUID PRIMARY KEY,
  month DATE NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT','REVIEWED','LOCKED','PAID','CLOSED')),
  generated_at TIMESTAMP NOT NULL,
  generated_by UUID NOT NULL,
  reviewed_at TIMESTAMP NULL,
  reviewed_by UUID NULL,
  locked_at TIMESTAMP NULL,
  locked_by UUID NULL,
  paid_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS payroll_item (
  id UUID PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES payroll_run(id),
  employee_id UUID NOT NULL REFERENCES employee(id),
  item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('BASE_PAY','ALLOWANCE','BONUS','DEDUCTION','ADJUSTMENT')),
  description VARCHAR(200) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  division_id UUID NULL REFERENCES division(id),
  is_system_generated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  UNIQUE (payroll_run_id, employee_id, item_type, description)
);

CREATE TABLE IF NOT EXISTS payroll_payment (
  id UUID PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES payroll_run(id),
  employee_id UUID NOT NULL REFERENCES employee(id),
  paid_amount NUMERIC(12,2) NOT NULL,
  paid_at TIMESTAMP NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('BANK_TRANSFER','UPI','CASH','OTHER')),
  reference_id VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS payslip (
  id UUID PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES payroll_run(id),
  employee_id UUID NOT NULL REFERENCES employee(id),
  storage_key VARCHAR(400) NOT NULL,
  file_name VARCHAR(200) NOT NULL,
  content_type VARCHAR(80) NOT NULL DEFAULT 'application/pdf',
  file_size BIGINT NULL,
  generated_at TIMESTAMP NOT NULL,
  generated_by UUID NOT NULL,
  UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_run_month ON payroll_run(month);
CREATE INDEX IF NOT EXISTS idx_payroll_run_status ON payroll_run(status);

CREATE INDEX IF NOT EXISTS idx_payroll_item_payroll_run_id ON payroll_item(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_employee_id ON payroll_item(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_division_id ON payroll_item(division_id);

CREATE INDEX IF NOT EXISTS idx_payroll_payment_payroll_run_id ON payroll_payment(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_employee_id ON payroll_payment(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_paid_at ON payroll_payment(paid_at);

CREATE INDEX IF NOT EXISTS idx_payslip_payroll_run_id ON payslip(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslip_employee_id ON payslip(employee_id);

COMMIT;
