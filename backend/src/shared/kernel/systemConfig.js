export async function getSystemConfigMap(pool) {
  const res = await pool.query('SELECT key, value, description FROM system_config ORDER BY key ASC');
  const map = {};
  for (const row of res.rows) {
    map[row.key] = { key: row.key, value: row.value, description: row.description };
  }
  return map;
}

export async function getSystemConfigValues(pool, keys) {
  const list = Array.isArray(keys) ? keys.map((k) => String(k)) : [];
  if (list.length === 0) return {};

  const res = await pool.query(
    'SELECT key, value FROM system_config WHERE key = ANY($1::text[])',
    [list]
  );

  const out = {};
  for (const row of res.rows || []) {
    out[row.key] = row.value;
  }
  return out;
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

export async function isEmployeeEnabled(pool) {
  const value = await getSystemConfigValue(pool, 'EMPLOYEE_ENABLED');
  if (value === null) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
}

export async function isAttendanceEnabled(pool) {
  const value = await getSystemConfigValue(pool, 'ATTENDANCE_ENABLED');
  if (value === null) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
}
