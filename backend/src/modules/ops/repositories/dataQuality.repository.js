export async function insertFinding(client, row) {
  const res = await client.query(
    `INSERT INTO data_quality_finding (
      id, finding_type, severity, title, details,
      division_id, entity_type, entity_id,
      status, created_at, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      row.id,
      row.finding_type,
      row.severity,
      row.title,
      row.details,
      row.division_id || null,
      row.entity_type,
      row.entity_id || null,
      row.status,
      row.created_at,
      row.created_by || null
    ]
  );
  return res.rows[0];
}

export async function findOpenFinding(client, { findingType, entityType, entityId }) {
  const res = await client.query(
    `SELECT *
     FROM data_quality_finding
     WHERE finding_type = $1
       AND entity_type = $2
       AND ($3::uuid IS NULL OR entity_id = $3::uuid)
       AND status IN ('OPEN','ACKNOWLEDGED')
     ORDER BY created_at DESC
     LIMIT 1`,
    [findingType, entityType, entityId || null]
  );
  return res.rows[0] || null;
}

export async function listFindings(pool, { divisionId, status, findingType, offset, limit }) {
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
  if (findingType) {
    params.push(String(findingType));
    where.push(`finding_type = $${params.length}`);
  }

  const sql = `
    SELECT *
    FROM data_quality_finding
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

export async function countFindings(pool, { divisionId, status, findingType }) {
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
  if (findingType) {
    params.push(String(findingType));
    where.push(`finding_type = $${params.length}`);
  }

  const sql = `
    SELECT COUNT(*)::int AS total
    FROM data_quality_finding
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
  `;

  const res = await pool.query(sql, params);
  return Number(res.rows[0]?.total || 0);
}

export async function getFindingById(client, { id, forUpdate }) {
  const res = await client.query(`SELECT * FROM data_quality_finding WHERE id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`, [id]);
  return res.rows[0] || null;
}

export async function updateFinding(client, { id, patch }) {
  const fields = [];
  const values = [];

  const allowed = ['status', 'resolved_at', 'resolved_by'];

  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      values.push(patch[k]);
      fields.push(`${k} = $${values.length}`);
    }
  }

  if (fields.length === 0) return null;

  values.push(id);
  const res = await client.query(
    `UPDATE data_quality_finding SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return res.rows[0] || null;
}
