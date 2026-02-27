import { Router } from 'express';

import { requirePermission } from '../../../../shared/kernel/authorization.js';
import { monthCloseController } from '../controller/monthCloseController.js';

export function monthCloseRoutes({ pool }) {
  const router = Router();
  const controller = monthCloseController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'MONTH_CLOSE_VIEW', getDivisionId: async () => null }),
    controller.list
  );

  router.get(
    '/preview',
    requirePermission({ pool, permissionCode: 'MONTH_CLOSE_PREVIEW', getDivisionId: async () => null }),
    controller.preview
  );

  router.post(
    '/close',
    requirePermission({ pool, permissionCode: 'MONTH_CLOSE_EXECUTE', getDivisionId: async () => null }),
    controller.close
  );

  router.get(
    '/adjustments',
    requirePermission({ pool, permissionCode: 'ADJUSTMENT_VIEW', getDivisionId: async () => null }),
    controller.listAdjustments
  );

  router.get(
    '/snapshots',
    requirePermission({ pool, permissionCode: 'MONTH_CLOSE_VIEW', getDivisionId: async () => null }),
    controller.listSnapshots
  );

  router.post(
    '/adjustments',
    requirePermission({ pool, permissionCode: 'ADJUSTMENT_CREATE', getDivisionId: async () => null }),
    controller.createAdjustment
  );

  router.post(
    '/status',
    requirePermission({ pool, permissionCode: 'MONTH_CLOSE_MANAGE', getDivisionId: async () => null }),
    controller.setStatus
  );

  return router;
}
