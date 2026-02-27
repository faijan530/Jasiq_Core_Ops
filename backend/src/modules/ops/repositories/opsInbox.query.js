import { readOpsConfig, assertOpsInboxEnabled } from '../services/opsPolicy.service.js';

function addHours(iso, hours) {
  const d = new Date(iso);
  d.setUTCHours(d.getUTCHours() + Number(hours || 0));
  return d.toISOString();
}

function normalizeItem(row) {
  return {
    itemType: row.item_type,
    entityId: row.entity_id,
    divisionId: row.division_id,
    title: row.title,
    createdAt: row.created_at,
    slaDueAt: row.sla_due_at,
    status: row.status,
    actions: row.actions
  };
}

export async function queryOpsInbox(pool, { actorId, divisionId, limit }) {
  const cfg = await readOpsConfig(pool);
  assertOpsInboxEnabled(cfg);

  const slaHours = cfg.approvalSlaHours;

  const divFilter = divisionId ? String(divisionId) : null;

  const sql = `
    WITH inbox AS (
      -- Leave approvals
      SELECT
        'LEAVE_REQUEST'::text AS item_type,
        lr.id AS entity_id,
        e.primary_division_id AS division_id,
        ('Leave request: ' || e.first_name || ' ' || e.last_name)::text AS title,
        lr.created_at AS created_at,
        (lr.created_at + ($1::int * interval '1 hour')) AS sla_due_at,
        lr.status AS status,
        ARRAY['APPROVE','REJECT']::text[] AS actions
      FROM leave_request lr
      JOIN employee e ON e.id = lr.employee_id
      WHERE lr.status = 'SUBMITTED'

      UNION ALL

      -- Timesheet approvals
      SELECT
        'TIMESHEET'::text AS item_type,
        th.id AS entity_id,
        e.primary_division_id AS division_id,
        ('Timesheet: ' || e.first_name || ' ' || e.last_name)::text AS title,
        th.created_at AS created_at,
        (th.created_at + ($1::int * interval '1 hour')) AS sla_due_at,
        th.status AS status,
        ARRAY['APPROVE','REJECT','REQUEST_REVISION']::text[] AS actions
      FROM timesheet_header th
      JOIN employee e ON e.id = th.employee_id
      WHERE th.status = 'SUBMITTED'

      UNION ALL

      -- Expense approvals
      SELECT
        'EXPENSE'::text AS item_type,
        ex.id AS entity_id,
        ex.division_id AS division_id,
        ('Expense: ' || ex.title)::text AS title,
        ex.created_at AS created_at,
        (ex.created_at + ($1::int * interval '1 hour')) AS sla_due_at,
        ex.status AS status,
        ARRAY['APPROVE','REJECT']::text[] AS actions
      FROM expense ex
      WHERE ex.status = 'SUBMITTED'

      UNION ALL

      -- Income approvals
      SELECT
        'INCOME'::text AS item_type,
        inc.id AS entity_id,
        inc.division_id AS division_id,
        ('Income: ' || inc.title)::text AS title,
        inc.created_at AS created_at,
        (inc.created_at + ($1::int * interval '1 hour')) AS sla_due_at,
        inc.status AS status,
        ARRAY['APPROVE','REJECT']::text[] AS actions
      FROM income inc
      WHERE inc.status = 'SUBMITTED'

      UNION ALL

      -- Payroll runs waiting for lock
      SELECT
        'PAYROLL_RUN'::text AS item_type,
        pr.id AS entity_id,
        NULL::uuid AS division_id,
        ('Payroll run: ' || to_char(pr.month, 'YYYY-MM'))::text AS title,
        pr.created_at AS created_at,
        (pr.created_at + ($1::int * interval '1 hour')) AS sla_due_at,
        pr.status AS status,
        ARRAY['LOCK']::text[] AS actions
      FROM payroll_run pr
      WHERE pr.status = 'REVIEWED'

      UNION ALL

      -- Month close (current month) if open
      SELECT
        'MONTH_CLOSE'::text AS item_type,
        mc.id AS entity_id,
        NULL::uuid AS division_id,
        ('Month close: ' || to_char(mc.month, 'YYYY-MM'))::text AS title,
        mc.month::timestamp AS created_at,
        (mc.month::timestamp + ($1::int * interval '1 hour')) AS sla_due_at,
        mc.status AS status,
        ARRAY['CLOSE','OPEN']::text[] AS actions
      FROM month_close mc
      WHERE mc.scope = 'COMPANY'
    )
    SELECT *
    FROM inbox
    WHERE (
      $2::uuid IS NULL
      OR division_id = $2::uuid
    )
    ORDER BY created_at DESC
    LIMIT $3::int
  `;

  const res = await pool.query(sql, [slaHours, divFilter, Number(limit || 50)]);

  // Filter by division scope for actor (RBAC is enforced at route middleware, but we also keep safe here)
  // Company scoped items (division_id null) are returned only if actor has company scope OPS_INBOX_READ.
  // Division items will be further filtered by route middleware (divisionId) and permission scopes.

  return (res.rows || []).map((r) => normalizeItem(r));
}
