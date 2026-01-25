export async function getSystemConfigMap(pool) {
  const res = await pool.query('SELECT key, value, description FROM system_config ORDER BY key ASC');
  const map = {};
  for (const row of res.rows) {
    map[row.key] = { key: row.key, value: row.value, description: row.description };
  }
  return map;
}

export async function getSystemConfigValue(pool, key) {
  const res = await pool.query('SELECT value FROM system_config WHERE key = $1', [key]);
  return res.rows[0]?.value ?? null;
}

export async function isMonthCloseEnabled(pool) {
  const value = await getSystemConfigValue(pool, 'MONTH_CLOSE_ENABLED');
  if (value === null) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
}

export async function isProjectsEnabled(pool) {
  const value = await getSystemConfigValue(pool, 'PROJECTS_ENABLED');
  if (value === null) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
}
