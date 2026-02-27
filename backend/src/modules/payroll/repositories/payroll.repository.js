export async function insertPayrollRun(client, row) {
  const res = await client.query(
    `INSERT INTO payroll_run (
       id, month, status,
       generated_at, generated_by,
       reviewed_at, reviewed_by,
       locked_at, locked_by,
       paid_at, closed_at,
       notes,
       created_at, updated_at,
       version
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW(),$13)
     RETURNING *`,
    [
      row.id,
      row.month,
      row.status,
      row.generated_at,
      row.generated_by,
      row.reviewed_at,
      row.reviewed_by,
      row.locked_at,
      row.locked_by,
      row.paid_at,
      row.closed_at,
      row.notes,
      row.version
    ]
  );
  return res.rows[0];
}

export async function getPayrollRunByMonth(client, { month }) {
  const res = await client.query('SELECT * FROM payroll_run WHERE month = $1::date', [month]);
  return res.rows[0] || null;
}

export async function getPayrollRunById(client, { id, forUpdate = false }) {
  const res = await client.query(
    `SELECT * FROM payroll_run WHERE id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id]
  );
  return res.rows[0] || null;
}

export async function listPayrollRuns(client, { fromMonth, toMonth, status, page, pageSize }) {
  const where = [];
  const params = [];
  let idx = 1;

  if (fromMonth) {
    where.push(`month >= $${idx++}::date`);
    params.push(fromMonth);
  }
  if (toMonth) {
    where.push(`month <= $${idx++}::date`);
    params.push(toMonth);
  }
  if (status) {
    where.push(`status = $${idx++}`);
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM payroll_run ${whereSql}`, params);
  const total = countRes.rows[0]?.cnt || 0;

  const offset = (page - 1) * pageSize;
  params.push(pageSize);
  params.push(offset);

  const rowsRes = await client.query(
    `SELECT *
     FROM payroll_run
     ${whereSql}
     ORDER BY month DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );

  return { items: rowsRes.rows, total };
}

export async function updatePayrollRunState(client, {
  id,
  status,
  reviewed_at,
  reviewed_by,
  locked_at,
  locked_by,
  paid_at,
  closed_at,
  notes
}) {
  const res = await client.query(
    `UPDATE payroll_run
     SET
       status = $2,
       reviewed_at = $3,
       reviewed_by = $4,
       locked_at = $5,
       locked_by = $6,
       paid_at = $7,
       closed_at = $8,
       notes = $9,
       updated_at = NOW(),
       version = version + 1
     WHERE id = $1
     RETURNING *`,
    [id, status, reviewed_at, reviewed_by, locked_at, locked_by, paid_at, closed_at, notes]
  );
  return res.rows[0] || null;
}
