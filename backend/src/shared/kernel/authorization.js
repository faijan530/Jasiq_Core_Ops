import { forbidden } from './errors.js';

export async function getUserGrants(pool, userId) {
  const res = await pool.query(
    `SELECT r.name AS role_name, ur.scope, ur.division_id, p.code AS permission_code
     FROM user_role ur
     JOIN role r ON r.id = ur.role_id
     JOIN role_permission rp ON rp.role_id = r.id
     JOIN permission p ON p.id = rp.permission_id
     WHERE ur.user_id = $1`,
    [userId]
  );

  const roles = new Set();
  const permissions = new Set();
  const scoped = [];

  for (const row of res.rows) {
    roles.add(row.role_name);
    permissions.add(row.permission_code);
    scoped.push({
      roleName: row.role_name,
      scope: row.scope,
      divisionId: row.division_id,
      permissionCode: row.permission_code
    });
  }

  return {
    roles: Array.from(roles).sort(),
    permissions: Array.from(permissions).sort(),
    scoped
  };
}

export function requirePermission({ pool, permissionCode, getDivisionId }) {
  return async function middleware(req, res, next) {
    try {
      const userId = req.auth?.userId;
      const grants = await getUserGrants(pool, userId);

      if (grants.permissions.includes('SYSTEM_FULL_ACCESS') || grants.roles.includes('SUPER_ADMIN')) {
        req.authorization = {
          roles: grants.roles,
          permissions: grants.permissions
        };

        next();
        return;
      }

      const divisionId = getDivisionId ? await getDivisionId(req) : null;

      const match = grants.scoped.find((g) => {
        if (g.permissionCode !== permissionCode) return false;
        if (g.scope === 'COMPANY') return true;
        if (!divisionId) return false;
        return String(g.divisionId) === String(divisionId);
      });

      if (!match) {
        next(forbidden());
        return;
      }

      req.authorization = {
        roles: grants.roles,
        permissions: grants.permissions
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireAnyPermission({ pool, permissionCodes, getDivisionId }) {
  return async function middleware(req, res, next) {
    try {
      const userId = req.auth?.userId;
      const grants = await getUserGrants(pool, userId);

      if (grants.permissions.includes('SYSTEM_FULL_ACCESS') || grants.roles.includes('SUPER_ADMIN')) {
        req.authorization = {
          roles: grants.roles,
          permissions: grants.permissions
        };

        next();
        return;
      }

      const divisionId = getDivisionId ? await getDivisionId(req) : null;

      const codes = Array.isArray(permissionCodes)
        ? permissionCodes.map((c) => String(c))
        : [];

      const match = grants.scoped.find((g) => {
        if (!codes.includes(g.permissionCode)) return false;
        if (g.scope === 'COMPANY') return true;
        if (!divisionId) return false;
        return String(g.divisionId) === String(divisionId);
      });

      if (!match) {
        next(forbidden());
        return;
      }

      req.authorization = {
        roles: grants.roles,
        permissions: grants.permissions
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
