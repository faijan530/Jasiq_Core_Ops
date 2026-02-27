export async function insertClient(client, row) {
  const res = await client.query(
    `INSERT INTO client (
       id, code, name, email, phone,
       is_active,
       created_at, created_by,
       updated_at, updated_by,
       version
     ) VALUES ($1,$2,$3,$4,$5,true,NOW(),$6,NOW(),$6,$7)
     RETURNING *`,
    [row.id, row.code, row.name, row.email, row.phone, row.created_by, row.version]
  );
  return res.rows[0];
}

export async function getClientById(client, { id }) {
  const res = await client.query('SELECT * FROM client WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getClientByCode(client, { code }) {
  const res = await client.query('SELECT * FROM client WHERE code = $1', [code]);
  return res.rows[0] || null;
}

export async function updateClient(client, { id, patch, actorId, expectedVersion }) {
  const res = await client.query(
    `UPDATE client
     SET
       code = COALESCE($2, code),
       name = COALESCE($3, name),
       email = COALESCE($4, email),
       phone = COALESCE($5, phone),
       is_active = COALESCE($6, is_active),
       updated_at = NOW(),
       updated_by = $7,
       version = version + 1
     WHERE id = $1 AND version = $8
     RETURNING *`,
    [
      id,
      patch.code ?? null,
      patch.name ?? null,
      patch.email ?? null,
      patch.phone ?? null,
      patch.is_active ?? null,
      actorId,
      expectedVersion
    ]
  );
  return res.rows[0] || null;
}

export async function listClients(client, { active = null, search = null, offset = 0, limit = 50 }) {
  const where = [];
  const params = [];
  let idx = 1;

  if (active !== null && active !== undefined) {
    where.push(`is_active = $${idx++}::boolean`);
    params.push(Boolean(active));
  }

  if (search) {
    where.push(`(code ILIKE $${idx++} OR name ILIKE $${idx++})`);
    const q = `%${String(search).trim()}%`;
    params.push(q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM client ${whereSql}`, params);
  const total = countRes.rows[0]?.cnt || 0;

  params.push(limit);
  params.push(offset);

  const rowsRes = await client.query(
    `SELECT *
     FROM client
     ${whereSql}
     ORDER BY code ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );

  return { items: rowsRes.rows, total };
}
