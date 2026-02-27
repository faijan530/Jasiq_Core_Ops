BEGIN;

CREATE TABLE IF NOT EXISTS income_category (
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

CREATE INDEX IF NOT EXISTS idx_income_cat_active ON income_category(is_active);

CREATE TABLE IF NOT EXISTS client (
  id UUID PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NULL,
  phone VARCHAR(60) NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_client_active ON client(is_active);

CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY,
  income_date DATE NOT NULL,
  category_id UUID NOT NULL REFERENCES income_category(id),
  client_id UUID NULL REFERENCES client(id),
  invoice_number VARCHAR(120) NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  division_id UUID NOT NULL REFERENCES division(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','PARTIALLY_PAID','PAID','CLOSED')),
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

CREATE INDEX IF NOT EXISTS idx_income_date ON income(income_date);
CREATE INDEX IF NOT EXISTS idx_income_status ON income(status);
CREATE INDEX IF NOT EXISTS idx_income_division ON income(division_id);
CREATE INDEX IF NOT EXISTS idx_income_category ON income(category_id);
CREATE INDEX IF NOT EXISTS idx_income_client ON income(client_id);

CREATE TABLE IF NOT EXISTS income_document (
  id UUID PRIMARY KEY,
  income_id UUID NOT NULL REFERENCES income(id),
  file_name VARCHAR(200) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  file_size BIGINT NOT NULL,
  storage_key VARCHAR(400) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_by UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_income_doc_income ON income_document(income_id);

CREATE TABLE IF NOT EXISTS income_payment (
  id UUID PRIMARY KEY,
  income_id UUID NOT NULL REFERENCES income(id),
  paid_amount NUMERIC(12,2) NOT NULL CHECK (paid_amount >= 0),
  paid_at TIMESTAMP NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('BANK_TRANSFER','UPI','CASH','CARD','OTHER')),
  reference_id VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_income_payment_income ON income_payment(income_id);

COMMIT;
