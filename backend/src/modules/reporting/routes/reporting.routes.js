import { Router } from 'express';

import { requirePermission } from '../../../shared/kernel/authorization.js';

import { reportingController } from '../controllers/reporting.controller.js';

export function reportingRoutes({ pool }) {
  const router = Router();
  const ctrl = reportingController({ pool });

  const canRead = requirePermission({
    pool,
    permissionCode: 'FINANCE_REPORT_READ',
    getDivisionId: async () => null
  });

  router.get('/revenue', canRead, ctrl.revenue);
  router.get('/expense', canRead, ctrl.expense);
  router.get('/pnl', canRead, ctrl.pnl);
  router.get('/receivables', canRead, ctrl.receivables);
  router.get('/payables', canRead, ctrl.payables);
  router.get('/cashflow', canRead, ctrl.cashflow);

  router.post('/exports/csv', canRead, ctrl.exportCsv);
  router.get('/exports/download', canRead, ctrl.downloadExport);

  return router;
}
