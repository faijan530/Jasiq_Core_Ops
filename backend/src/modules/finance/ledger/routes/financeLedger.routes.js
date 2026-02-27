import { Router } from 'express';

import { requirePermission } from '../../../../shared/kernel/authorization.js';
import { financeLedgerController } from '../controllers/financeLedger.controller.js';

export function financeLedgerRoutes({ pool }) {
  const router = Router();
  const ctrl = financeLedgerController({ pool });

  router.get(
    '/',
    requirePermission({ pool, permissionCode: 'FINANCE_LEDGER_READ', getDivisionId: async () => null }),
    ctrl.list
  );

  return router;
}
