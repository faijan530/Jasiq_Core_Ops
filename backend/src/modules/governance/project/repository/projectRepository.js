export async function countProjects(client, { divisionId }) {
  const res = await client.query(
    'SELECT COUNT(*)::int AS c FROM project WHERE ($1::uuid IS NULL OR division_id = $1)',
    [divisionId || null]
  );
  return res.rows[0].c;
}

export async function listProjects(client, { divisionId, offset, limit }) {
  const res = await client.query(
    `SELECT *
     FROM project
     WHERE ($1::uuid IS NULL OR division_id = $1)
     ORDER BY division_id ASC, code ASC
     OFFSET $2 LIMIT $3`,
    [divisionId || null, offset, limit]
  );
  return res.rows;
}

export async function getProjectById(client, id) {
  const res = await client.query('SELECT * FROM project WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getProjectByDivisionAndCode(client, { divisionId, code }) {
  const res = await client.query(
    'SELECT * FROM project WHERE division_id = $1 AND code = $2',
    [divisionId, code]
  );
  return res.rows[0] || null;
}

export async function insertProject(client, row) {
  await client.query(
    `INSERT INTO project (
      id, division_id, code, name, is_active,
      created_at, created_by, updated_at, updated_by, version
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      row.id,
      row.division_id,
      row.code,
      row.name,
      row.is_active,
      row.created_at,
      row.created_by,
      row.updated_at,
      row.updated_by,
      row.version
    ]
  );
}

export async function updateProject(client, { id, name, isActive, actorId }) {
  const res = await client.query(
    `UPDATE project
     SET name = COALESCE($2, name),
         is_active = COALESCE($3, is_active),
         updated_at = NOW(),
         updated_by = $4,
         version = version + 1
     WHERE id = $1
     RETURNING *`,
    [id, name ?? null, typeof isActive === 'boolean' ? isActive : null, actorId]
  );
  return res.rows[0] || null;
}
