import { Router } from 'express';

import { requirePermission } from '../../../../shared/kernel/authorization.js';
import { financeReportsController } from '../controllers/financeReports.controller.js';

export function financeReportsRoutes({ pool }) {
  const router = Router();
  const ctrl = financeReportsController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'FINANCE_REPORT_READ', getDivisionId: async () => null }),
    ctrl.summary
  );

  router.get(
    '/summary',
    requirePermission({ pool, permissionCode: 'FINANCE_REPORT_READ', getDivisionId: async () => null }),
    ctrl.monthSummary
  );

  return router;
}
