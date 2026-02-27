BEGIN;

CREATE TABLE IF NOT EXISTS month_snapshot (
  id UUID PRIMARY KEY,
  month DATE NOT NULL,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('COMPANY')),
  snapshot_version INT NOT NULL DEFAULT 1,
  total_income NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_expense NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_payroll NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_profit_loss NUMERIC(14,2) NOT NULL DEFAULT 0,
  division_breakdown JSONB NOT NULL,
  category_breakdown JSONB NULL,
  payroll_breakdown JSONB NULL,
  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL,
  UNIQUE(month, scope, snapshot_version)
);

CREATE INDEX IF NOT EXISTS idx_month_snapshot_month ON month_snapshot(month);

CREATE TABLE IF NOT EXISTS adjustment (
  id UUID PRIMARY KEY,
  adjustment_date DATE NOT NULL,
  adjustment_month DATE NOT NULL,
  target_month DATE NOT NULL,
  target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('EXPENSE','INCOME','PAYROLL','SETTLEMENT','REIMBURSEMENT')),
  target_id UUID NULL,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('COMPANY','DIVISION')),
  division_id UUID NULL REFERENCES division(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('INCREASE','DECREASE')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_adjustment_target_month ON adjustment(target_month);
CREATE INDEX IF NOT EXISTS idx_adjustment_adjustment_month ON adjustment(adjustment_month);
CREATE INDEX IF NOT EXISTS idx_adjustment_division ON adjustment(division_id);

COMMIT;
