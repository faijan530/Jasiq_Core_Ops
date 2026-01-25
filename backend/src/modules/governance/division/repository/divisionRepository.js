export async function listDivisions(client, { offset, limit }) {
  const res = await client.query(
    `SELECT * FROM division ORDER BY code ASC OFFSET $1 LIMIT $2`,
    [offset, limit]
  );
  return res.rows;
}

export async function countDivisions(client) {
  const res = await client.query('SELECT COUNT(*)::int AS c FROM division');
  return res.rows[0].c;
}

export async function getDivisionById(client, id) {
  const res = await client.query('SELECT * FROM division WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getDivisionByCode(client, code) {
  const res = await client.query('SELECT * FROM division WHERE code = $1', [code]);
  return res.rows[0] || null;
}

export async function insertDivision(client, row) {
  await client.query(
    `INSERT INTO division (
      id, code, name, is_active,
      created_at, created_by, updated_at, updated_by, version
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      row.id,
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

export async function updateDivisionIsActive(client, { id, isActive, actorId }) {
  const res = await client.query(
    `UPDATE division
     SET is_active = $2,
         updated_at = NOW(),
         updated_by = $3,
         version = version + 1
     WHERE id = $1
     RETURNING *`,
    [id, isActive, actorId]
  );
  return res.rows[0] || null;
}
