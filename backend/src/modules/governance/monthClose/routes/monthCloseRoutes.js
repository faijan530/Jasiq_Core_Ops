import { Router } from 'express';

import { requirePermission } from '../../../../shared/kernel/authorization.js';
import { monthCloseController } from '../controller/monthCloseController.js';

export function monthCloseRoutes({ pool }) {
  const router = Router();
  const controller = monthCloseController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'GOV_MONTH_CLOSE_READ' }),
    controller.list
  );

  router.post(
    '/status',
    requirePermission({ pool, permissionCode: 'GOV_MONTH_CLOSE_WRITE' }),
    controller.setStatus
  );

  return router;
}
