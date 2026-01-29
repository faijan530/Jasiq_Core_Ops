BEGIN;

CREATE TABLE IF NOT EXISTS leave_type (
  id UUID PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_paid BOOLEAN NOT NULL,
  supports_half_day BOOLEAN NOT NULL DEFAULT true,
  affects_payroll BOOLEAN NOT NULL DEFAULT false,
  deduction_rule TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by UUID NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_leave_type_is_active ON leave_type(is_active);

CREATE TABLE IF NOT EXISTS leave_balance (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id),
  leave_type_id UUID NOT NULL REFERENCES leave_type(id),
  year INT NOT NULL,
  opening_balance NUMERIC(6,2) NOT NULL DEFAULT 0,
  granted_balance NUMERIC(6,2) NOT NULL DEFAULT 0,
  consumed_balance NUMERIC(6,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by UUID NOT NULL,
  version INT NOT NULL DEFAULT 1,
  UNIQUE (employee_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balance_employee_year ON leave_balance(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_balance_leave_type ON leave_balance(leave_type_id);

CREATE TABLE IF NOT EXISTS leave_request (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id),
  leave_type_id UUID NOT NULL REFERENCES leave_type(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  unit VARCHAR(20) NOT NULL CHECK (unit IN ('FULL_DAY','HALF_DAY')),
  half_day_part VARCHAR(10) NULL CHECK (half_day_part IN ('AM','PM')),
  units NUMERIC(6,2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SUBMITTED','APPROVED','REJECTED','CANCELLED')),
  approved_l1_by UUID NULL,
  approved_l1_at TIMESTAMP NULL,
  approved_l2_by UUID NULL,
  approved_l2_at TIMESTAMP NULL,
  rejected_by UUID NULL,
  rejected_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  cancelled_by UUID NULL,
  cancelled_at TIMESTAMP NULL,
  cancel_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_leave_request_employee_dates ON leave_request(employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_request_status ON leave_request(status);
CREATE INDEX IF NOT EXISTS idx_leave_request_leave_type ON leave_request(leave_type_id);

CREATE TABLE IF NOT EXISTS leave_attachment (
  id UUID PRIMARY KEY,
  leave_request_id UUID NOT NULL REFERENCES leave_request(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL,
  uploaded_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leave_attachment_request ON leave_attachment(leave_request_id);

COMMIT;
