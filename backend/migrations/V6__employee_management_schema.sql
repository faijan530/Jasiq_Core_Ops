BEGIN;

CREATE TABLE IF NOT EXISTS employee (
  id UUID PRIMARY KEY,
  employee_code VARCHAR(30) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','ON_HOLD','EXITED')),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('COMPANY','DIVISION')),
  primary_division_id UUID NULL REFERENCES division(id),
  idempotency_key VARCHAR(80) UNIQUE,
  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  updated_by UUID NOT NULL,
  version INT NOT NULL DEFAULT 1,
  CONSTRAINT employee_scope_division_check CHECK (
    (scope = 'COMPANY' AND primary_division_id IS NULL)
    OR
    (scope = 'DIVISION' AND primary_division_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS employee_scope_history (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('COMPANY','DIVISION')),
  primary_division_id UUID NULL REFERENCES division(id),
  effective_from TIMESTAMP NOT NULL,
  effective_to TIMESTAMP,
  reason TEXT NOT NULL,
  changed_at TIMESTAMP NOT NULL,
  changed_by UUID NOT NULL,
  CONSTRAINT employee_scope_history_scope_division_check CHECK (
    (scope = 'COMPANY' AND primary_division_id IS NULL)
    OR
    (scope = 'DIVISION' AND primary_division_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS employee_document (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id),
  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(260) NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(120),
  size_bytes INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_at TIMESTAMP NOT NULL,
  uploaded_by UUID NOT NULL,
  deactivated_at TIMESTAMP,
  deactivated_by UUID,
  deactivated_reason TEXT
);

CREATE TABLE IF NOT EXISTS employee_compensation_version (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id),
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('HOURLY','MONTHLY','ANNUAL')),
  effective_from DATE NOT NULL,
  effective_to DATE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  CONSTRAINT employee_compensation_effective_to_check CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_employee_status ON employee(status);
CREATE INDEX IF NOT EXISTS idx_employee_primary_division_id ON employee(primary_division_id);

CREATE INDEX IF NOT EXISTS idx_employee_scope_history_employee_id ON employee_scope_history(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_scope_history_active ON employee_scope_history(employee_id) WHERE effective_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_document_employee_id ON employee_document(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_document_active ON employee_document(employee_id, is_active);

CREATE INDEX IF NOT EXISTS idx_employee_compensation_version_employee_id ON employee_compensation_version(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_compensation_version_active ON employee_compensation_version(employee_id) WHERE effective_to IS NULL;

COMMIT;
