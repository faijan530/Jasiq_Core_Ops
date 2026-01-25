export async function countSystemConfigs(client) {
  const res = await client.query('SELECT COUNT(*)::int AS c FROM system_config');
  return res.rows[0].c;
}

export async function listSystemConfigs(client, { offset, limit }) {
  const res = await client.query(
    'SELECT key, value, description FROM system_config ORDER BY key ASC OFFSET $1 LIMIT $2',
    [offset, limit]
  );
  return res.rows;
}

export async function getSystemConfig(client, key) {
  const res = await client.query(
    'SELECT key, value, description FROM system_config WHERE key = $1',
    [key]
  );
  return res.rows[0] || null;
}

export async function upsertSystemConfig(client, { key, value, description }) {
  const res = await client.query(
    `INSERT INTO system_config (key, value, description)
     VALUES ($1,$2,$3)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, description = COALESCE(EXCLUDED.description, system_config.description)
     RETURNING key, value, description`,
    [key, value, description ?? null]
  );
  return res.rows[0];
}
