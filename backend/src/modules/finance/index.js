import { Router } from 'express';

import { financeDashboardRoutes } from './dashboard/routes/financeDashboard.routes.js';
import { financeLedgerRoutes } from './ledger/routes/financeLedger.routes.js';
import { financeMonthCloseRoutes } from './monthClose/routes/financeMonthClose.routes.js';
import { financeReportsRoutes } from './reports/routes/financeReports.routes.js';

export function financeRoutes({ pool }) {
  const router = Router();

  router.use('/dashboard', financeDashboardRoutes({ pool }));
  router.use('/ledger', financeLedgerRoutes({ pool }));
  router.use('/reports', financeReportsRoutes({ pool }));
  router.use('/month-close', financeMonthCloseRoutes({ pool }));

  return router;
}
