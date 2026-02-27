BEGIN;

ALTER TABLE payslip
  ADD COLUMN IF NOT EXISTS payslip_number VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS snapshot JSONB NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payslip_number ON payslip(payslip_number);

COMMIT;
