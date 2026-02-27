import { Router } from 'express';

import { requirePermission } from '../../../../shared/kernel/authorization.js';
import { financeDashboardController } from '../controllers/financeDashboard.controller.js';

export function financeDashboardRoutes({ pool }) {
  const router = Router();
  const ctrl = financeDashboardController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'FINANCE_REPORT_READ', getDivisionId: async () => null }),
    ctrl.get
  );

  return router;
}
