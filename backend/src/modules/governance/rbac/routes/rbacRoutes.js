import { Router } from 'express';

import { requirePermission } from '../../../../shared/kernel/authorization.js';
import { rbacController } from '../controller/rbacController.js';

export function rbacRoutes({ pool }) {
  const router = Router();
  const controller = rbacController({ pool });

  router.get(
    '/roles',
    requirePermission({ pool, permissionCode: 'GOV_RBAC_READ' }),
    controller.listRoles
  );

  router.get(
    '/permissions',
    requirePermission({ pool, permissionCode: 'GOV_RBAC_READ' }),
    controller.listPermissions
  );

  router.get(
    '/roles/:id',
    requirePermission({ pool, permissionCode: 'GOV_RBAC_READ' }),
    controller.getRole
  );

  return router;
}
