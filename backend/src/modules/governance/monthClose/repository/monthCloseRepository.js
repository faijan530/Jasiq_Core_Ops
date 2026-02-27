export async function getMonthClose(client, { month, scope }) {
  const res = await client.query(
    `SELECT *
     FROM month_close
     WHERE scope = $2
       AND month::date = $1::date
     ORDER BY (status = 'CLOSED') DESC, closed_at DESC NULLS LAST, month DESC
     LIMIT 1`,
    [month, scope]
  );
  return res.rows[0] || null;
}

export async function getSnapshot(client, { month, scope, snapshotVersion = 1 }) {
  const res = await client.query(
    `SELECT *
     FROM month_snapshot
     WHERE month::date = $1::date
       AND scope = $2
       AND snapshot_version = $3
     LIMIT 1`,
    [month, scope, Number(snapshotVersion || 1)]
  );
  return res.rows[0] || null;
}

export async function listSnapshots(client, { month, scope, offset, limit }) {
  const res = await client.query(
    `SELECT *
     FROM month_snapshot
     WHERE ($1::date IS NULL OR month::date = $1::date)
       AND ($2::text IS NULL OR scope = $2::text)
     ORDER BY month DESC, snapshot_version DESC, created_at DESC, id DESC
     OFFSET $3 LIMIT $4`,
    [month || null, scope || null, offset, limit]
  );
  return res.rows || [];
}

export async function countSnapshots(client, { month, scope }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM month_snapshot
     WHERE ($1::date IS NULL OR month::date = $1::date)
       AND ($2::text IS NULL OR scope = $2::text)`,
    [month || null, scope || null]
  );
  return res.rows[0]?.c || 0;
}

export async function insertSnapshot(client, row) {
  const res = await client.query(
    `INSERT INTO month_snapshot (
      id, month, scope, snapshot_version,
      total_income, total_expense, total_payroll, net_profit_loss,
      division_breakdown, category_breakdown, payroll_breakdown,
      created_at, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *`,
    [
      row.id,
      row.month,
      row.scope,
      Number(row.snapshot_version || 1),
      row.total_income ?? 0,
      row.total_expense ?? 0,
      row.total_payroll ?? 0,
      row.net_profit_loss ?? 0,
      row.division_breakdown,
      row.category_breakdown ?? null,
      row.payroll_breakdown ?? null,
      row.created_at,
      row.created_by
    ]
  );
  return res.rows[0] || null;
}

export async function insertAdjustment(client, row) {
  const res = await client.query(
    `INSERT INTO adjustment (
      id, adjustment_date, adjustment_month, target_month,
      target_type, target_id,
      scope, division_id,
      direction, amount, reason,
      created_at, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *`,
    [
      row.id,
      row.adjustment_date,
      row.adjustment_month,
      row.target_month,
      row.target_type,
      row.target_id || null,
      row.scope,
      row.division_id || null,
      row.direction,
      row.amount,
      row.reason,
      row.created_at,
      row.created_by
    ]
  );
  return res.rows[0] || null;
}

export async function getAdjustmentsByTargetMonth(client, { targetMonth, scope }) {
  const res = await client.query(
    `SELECT *
     FROM adjustment
     WHERE target_month::date = $1::date
       AND scope = $2
     ORDER BY created_at DESC, id DESC`,
    [targetMonth, scope]
  );
  return res.rows || [];
}

export async function listAdjustments(client, { targetMonth, divisionId, targetType, offset, limit }) {
  const res = await client.query(
    `SELECT *
     FROM adjustment
     WHERE ($1::date IS NULL OR target_month::date = $1::date)
       AND ($2::uuid IS NULL OR division_id = $2::uuid)
       AND ($3::text IS NULL OR target_type = $3::text)
     ORDER BY created_at DESC, id DESC
     OFFSET $4 LIMIT $5`,
    [targetMonth || null, divisionId || null, targetType || null, offset, limit]
  );
  return res.rows || [];
}

export async function countAdjustments(client, { targetMonth, divisionId, targetType }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM adjustment
     WHERE ($1::date IS NULL OR target_month::date = $1::date)
       AND ($2::uuid IS NULL OR division_id = $2::uuid)
       AND ($3::text IS NULL OR target_type = $3::text)`,
    [targetMonth || null, divisionId || null, targetType || null]
  );
  return res.rows[0]?.c || 0;
}

export async function getMonthCloseWithUser(client, { month, scope }) {
  const res = await client.query(
    `SELECT 
       mc.id,
       mc.month,
       mc.scope,
       mc.status,
       mc.closed_at,
       mc.closed_by,
       mc.closed_reason,
       mc.opened_at,
       mc.opened_by
     FROM month_close mc
     WHERE mc.scope = $2
       AND mc.month::date = $1::date
     ORDER BY (mc.status = 'CLOSED') DESC, mc.closed_at DESC NULLS LAST, mc.month DESC
     LIMIT 1`,
    [month, scope]
  );
  return res.rows[0] || null;
}

export async function getLatestMonthClose(client, { month, scope }) {
  const res = await client.query(
    `SELECT *
     FROM month_close
     WHERE scope = $2
       AND month::date = $1::date
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [month, scope]
  );
  return res.rows[0] || null;
}

export async function countMonthCloses(client) {
  const res = await client.query(
    `SELECT COUNT(DISTINCT month::date)::int AS c
     FROM month_close`
  );
  return res.rows[0].c;
}

export async function listMonthCloses(client, { offset, limit }) {
  const res = await client.query(
    `SELECT DISTINCT ON (month, scope)
       id,
       month,
       scope,
       status,
       closed_at,
       closed_by,
       closed_reason,
       opened_at,
       opened_by
     FROM month_close
     ORDER BY
       month DESC,
       scope ASC,
       (status = 'CLOSED') DESC,
       closed_at DESC NULLS LAST
     OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  return res.rows;
}

export async function insertMonthClose(client, row) {
  const res = await client.query(
    `INSERT INTO month_close (
      id, month, scope, status, closed_at, closed_by, closed_reason, opened_at, opened_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    [
      row.id,
      row.month,
      row.scope,
      row.status,
      row.closed_at || null,
      row.closed_by || null,
      row.closed_reason || null,
      row.opened_at || null,
      row.opened_by || null
    ]
  );
  return res.rows[0];
}

export async function updateMonthCloseStatus(client, { id, status, actorId, reason }) {
  if (status === 'CLOSED') {
    const res = await client.query(
      `UPDATE month_close
       SET status = 'CLOSED',
           closed_at = NOW(),
           closed_by = $2,
           closed_reason = $3,
           opened_at = NULL,
           opened_by = NULL
       WHERE id = $1
       RETURNING *`,
      [id, actorId, reason || null]
    );
    return res.rows[0] || null;
  }

  const res = await client.query(
    `UPDATE month_close
     SET status = 'OPEN',
         opened_at = NOW(),
         opened_by = $2,
         closed_at = NULL,
         closed_by = NULL,
         closed_reason = NULL
     WHERE id = $1
     RETURNING *`,
    [id, actorId]
  );
  return res.rows[0] || null;
}
