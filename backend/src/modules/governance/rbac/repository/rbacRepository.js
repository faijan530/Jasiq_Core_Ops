export async function countRoles(client) {
  const res = await client.query('SELECT COUNT(*)::int AS c FROM role');
  return res.rows[0].c;
}

export async function listRoles(client, { offset, limit }) {
  const res = await client.query('SELECT * FROM role ORDER BY name ASC OFFSET $1 LIMIT $2', [offset, limit]);
  return res.rows;
}

export async function getRoleById(client, id) {
  const res = await client.query('SELECT * FROM role WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function listRolePermissions(client, roleId) {
  const res = await client.query(
    `SELECT p.*
     FROM role_permission rp
     JOIN permission p ON p.id = rp.permission_id
     WHERE rp.role_id = $1
     ORDER BY p.code ASC`,
    [roleId]
  );
  return res.rows;
}

export async function countPermissions(client) {
  const res = await client.query('SELECT COUNT(*)::int AS c FROM permission');
  return res.rows[0].c;
}

export async function listPermissions(client, { offset, limit }) {
  const res = await client.query('SELECT * FROM permission ORDER BY code ASC OFFSET $1 LIMIT $2', [offset, limit]);
  return res.rows;
}
