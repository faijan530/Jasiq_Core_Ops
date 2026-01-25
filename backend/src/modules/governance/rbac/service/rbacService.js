import { notFound } from '../../../../shared/kernel/errors.js';

import {
  countPermissions,
  countRoles,
  getRoleById,
  listPermissions,
  listRolePermissions,
  listRoles
} from '../repository/rbacRepository.js';

export async function listRolesPaged(pool, { offset, limit }) {
  const res = await pool.query('SELECT * FROM role ORDER BY name ASC OFFSET $1 LIMIT $2', [offset, limit]);
  const total = await countRoles(pool);
  return { rows: res.rows, total };
}

export async function listPermissionsPaged(pool, { offset, limit }) {
  const res = await pool.query('SELECT * FROM permission ORDER BY code ASC OFFSET $1 LIMIT $2', [offset, limit]);
  const total = await countPermissions(pool);
  return { rows: res.rows, total };
}

export async function getRoleWithPermissions(pool, roleId) {
  const role = await getRoleById(pool, roleId);
  if (!role) throw notFound('Role not found');
  const permissions = await listRolePermissions(pool, roleId);
  return { role, permissions };
}
