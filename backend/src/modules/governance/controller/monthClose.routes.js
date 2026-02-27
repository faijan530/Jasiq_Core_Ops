import { Router } from 'express';

import { requirePermission } from '../../../shared/kernel/authorization.js';
import { monthCloseController } from './monthClose.controller.js';

export function monthCloseRoutes({ pool }) {
  const router = Router();
  const controller = monthCloseController({ pool });

  router.post(
    '/month-close',
    requirePermission({
      pool,
      permissionCode: 'LEAVE_MONTH_CLOSE_OVERRIDE',
      getDivisionId: async () => null
    }),
    controller.close
  );

  return router;
}
