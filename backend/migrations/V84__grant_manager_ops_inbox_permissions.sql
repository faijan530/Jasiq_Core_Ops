BEGIN;

-- Grant Ops Inbox permissions to MANAGER (idempotent)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'MANAGER'
  AND p.code IN (
    'OPS_INBOX_READ',
    'OPS_INBOX_ACTION'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

COMMIT;
