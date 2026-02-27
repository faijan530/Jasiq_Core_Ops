BEGIN;

INSERT INTO permission (id, code, description) VALUES
  (gen_random_uuid(), 'MONTH_CLOSE_VIEW', 'View month close status'),
  (gen_random_uuid(), 'MONTH_CLOSE_PREVIEW', 'Preview month close readiness and totals'),
  (gen_random_uuid(), 'MONTH_CLOSE_EXECUTE', 'Execute month close (generate snapshot and mark closed)'),
  (gen_random_uuid(), 'ADJUSTMENT_CREATE', 'Create month adjustment entries'),
  (gen_random_uuid(), 'ADJUSTMENT_VIEW', 'View month adjustment entries')
ON CONFLICT (code) DO NOTHING;

COMMIT;
