BEGIN;

-- Enable reporting module + exports (idempotent)
INSERT INTO system_config (key, value, description) VALUES
  ('REPORTING_ENABLED', 'true', 'Enable reporting module'),
  ('REPORTING_EXPORT_CSV_ENABLED', 'true', 'Enable CSV export for reporting'),
  ('REPORTING_PAYROLL_INCLUDED_IN_PNL', 'true', 'Allow payroll costs to be included in P&L reports'),
  ('REPORTING_DIVISION_VIEW_ENABLED', 'true', 'Allow division-scoped reporting views'),
  ('REPORTING_CONSOLIDATED_VIEW_ENABLED', 'true', 'Allow consolidated reporting views')
ON CONFLICT (key) DO NOTHING;

COMMIT;
