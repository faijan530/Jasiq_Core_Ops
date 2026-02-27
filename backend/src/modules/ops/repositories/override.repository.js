export async function listOverrides(pool, { divisionId, status, overrideType, offset, limit }) {
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
  if (overrideType) {
    params.push(String(overrideType));
    where.push(`override_type = $${params.length}`);
  }

  const sql = `
    SELECT *
    FROM override_request
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY requested_at DESC
    OFFSET $${params.length + 1}::int
    LIMIT $${params.length + 2}::int
  `;

  params.push(Number(offset || 0));
  params.push(Number(limit || 50));

  const res = await pool.query(sql, params);
  return res.rows || [];
}

export async function countOverrides(pool, { divisionId, status, overrideType }) {
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
  if (overrideType) {
    params.push(String(overrideType));
    where.push(`override_type = $${params.length}`);
  }

  const sql = `
    SELECT COUNT(*)::int AS total
    FROM override_request
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
  `;

  const res = await pool.query(sql, params);
  return Number(res.rows[0]?.total || 0);
}

export async function insertOverrideRequest(client, row) {
  const res = await client.query(
    `INSERT INTO override_request (
      id, override_type, division_id, target_entity_type, target_entity_id,
      requested_action, reason, status,
      requested_by, requested_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      row.id,
      row.override_type,
      row.division_id || null,
      row.target_entity_type,
      row.target_entity_id,
      row.requested_action,
      row.reason,
      row.status,
      row.requested_by,
      row.requested_at
    ]
  );
  return res.rows[0];
}

export async function getOverrideById(client, { id, forUpdate }) {
  const res = await client.query(`SELECT * FROM override_request WHERE id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`, [id]);
  return res.rows[0] || null;
}

export async function updateOverride(client, { id, patch }) {
  const fields = [];
  const values = [];

  const allowed = [
    'status',
    'approved_by',
    'approved_at',
    'approval_reason',
    'executed_by',
    'executed_at',
    'execution_result'
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
    `UPDATE override_request SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return res.rows[0] || null;
}
