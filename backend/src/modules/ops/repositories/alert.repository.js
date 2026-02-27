export async function listAlerts(pool, { divisionId, status, alertType, offset, limit }) {
  const where = [];
  const params = [];

  if (divisionId) {
    params.push(String(divisionId));
    where.push(`division_id = $${params.length}::uuid`);
  }
  if (status) {
    params.push(String(status));
    where.push(`status = $${params.length}`);
  }
  if (alertType) {
    params.push(String(alertType));
    where.push(`alert_type = $${params.length}`);
  }

  const sql = `
    SELECT *
    FROM ops_alert
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC
    OFFSET $${params.length + 1}::int
    LIMIT $${params.length + 2}::int
  `;

  params.push(Number(offset || 0));
  params.push(Number(limit || 50));

  const res = await pool.query(sql, params);
  return res.rows || [];
}

export async function countAlerts(pool, { divisionId, status, alertType }) {
  const where = [];
  const params = [];

  if (divisionId) {
    params.push(String(divisionId));
    where.push(`division_id = $${params.length}::uuid`);
  }
  if (status) {
    params.push(String(status));
    where.push(`status = $${params.length}`);
  }
  if (alertType) {
    params.push(String(alertType));
    where.push(`alert_type = $${params.length}`);
  }

  const sql = `
    SELECT COUNT(*)::int AS total
    FROM ops_alert
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
  `;

  const res = await pool.query(sql, params);
  return Number(res.rows[0]?.total || 0);
}

export async function getAlertById(client, { id, forUpdate }) {
  const sql = `SELECT * FROM ops_alert WHERE id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`;
  const res = await client.query(sql, [id]);
  return res.rows[0] || null;
}

export async function updateAlert(client, { id, patch }) {
  const fields = [];
  const values = [];

  const allowed = [
    'status',
    'acknowledged_at',
    'acknowledged_by',
    'resolved_at',
    'resolved_by'
  ];

  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      values.push(patch[k]);
      fields.push(`${k} = $${values.length}`);
    }
  }

  if (fields.length === 0) return null;

  values.push(id);
  const res = await client.query(
    `UPDATE ops_alert SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return res.rows[0] || null;
}
