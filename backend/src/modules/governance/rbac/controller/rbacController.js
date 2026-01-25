import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';

import { toPermissionDto, toRoleDto } from '../domain/rbac.js';
import { getRoleWithPermissions, listPermissionsPaged, listRolesPaged } from '../service/rbacService.js';

export function rbacController({ pool }) {
  return {
    listRoles: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const { rows, total } = await listRolesPaged(pool, { offset, limit });
      res.json(pagedResponse({ items: rows.map(toRoleDto), total, page, pageSize }));
    }),

    listPermissions: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const { rows, total } = await listPermissionsPaged(pool, { offset, limit });
      res.json(pagedResponse({ items: rows.map(toPermissionDto), total, page, pageSize }));
    }),

    getRole: asyncHandler(async (req, res) => {
      const { role, permissions } = await getRoleWithPermissions(pool, req.params.id);
      res.json({
        item: {
          ...toRoleDto(role),
          permissions: permissions.map(toPermissionDto)
        }
      });
    })
  };
}
