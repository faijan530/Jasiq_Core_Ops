BEGIN;

-- Grant limited Ops permissions to HR_ADMIN (idempotent)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'HR_ADMIN'
  AND p.code IN (
    'OPS_INBOX_READ',
    'OPS_ALERT_READ',
    'OPS_ALERT_ACK',
    'OPS_ALERT_RESOLVE',
    'OPS_DATA_QUALITY_RUN',
    'OPS_DATA_QUALITY_READ',
    'OPS_DATA_QUALITY_ACK',
    'OPS_DATA_QUALITY_RESOLVE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
