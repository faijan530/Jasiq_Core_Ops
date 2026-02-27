import { Router } from 'express';

import { requirePermission } from '../../../../shared/kernel/authorization.js';
import { financeMonthCloseController } from '../controllers/financeMonthClose.controller.js';

export function financeMonthCloseRoutes({ pool }) {
  const router = Router();
  const ctrl = financeMonthCloseController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'GOV_MONTH_CLOSE_READ', getDivisionId: async () => null }),
    ctrl.list
  );

  router.post(
    '/:month/close',
    requirePermission({ pool, permissionCode: 'MONTH_CLOSE_EXECUTE', getDivisionId: async () => null }),
    ctrl.close
  );

  return router;
}
