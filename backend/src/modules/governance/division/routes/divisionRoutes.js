import { Router } from 'express';

import { divisionController } from '../controller/divisionController.js';
import { requirePermission } from '../../../../shared/kernel/authorization.js';

export function divisionRoutes({ pool }) {
  const router = Router();
  const controller = divisionController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'GOV_DIVISION_READ' }),
    controller.list
  );

  router.get(
    '/:id',
    requirePermission({ pool, permissionCode: 'GOV_DIVISION_READ' }),
    controller.getById
  );

  router.post(
    '/',
    requirePermission({ pool, permissionCode: 'GOV_DIVISION_WRITE' }),
    controller.create
  );

  router.patch(
    '/:id/activation',
    requirePermission({ pool, permissionCode: 'GOV_DIVISION_WRITE' }),
    controller.setActive
  );

  return router;
}
