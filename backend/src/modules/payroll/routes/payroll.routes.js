import { Router } from 'express';

import { requireAnyPermission, requirePermission } from '../../../shared/kernel/authorization.js';

import { payrollController } from '../controllers/payroll.controller.js';
import { payrollItemController } from '../controllers/payrollItem.controller.js';
import { payslipController } from '../controllers/payslip.controller.js';

export function payrollRoutes({ pool }) {
  const router = Router();

  const runCtrl = payrollController({ pool });
  const itemCtrl = payrollItemController({ pool });
  const slipCtrl = payslipController({ pool });

  router.get(
    '/runs',
    requirePermission({ pool, permissionCode: 'PAYROLL_RUN_READ', getDivisionId: async () => null }),
    runCtrl.list
  );

  router.post(
    '/runs',
    requirePermission({ pool, permissionCode: 'PAYROLL_GENERATE', getDivisionId: async () => null }),
    runCtrl.create
  );

  router.get(
    '/runs/:id',
    requirePermission({ pool, permissionCode: 'PAYROLL_RUN_READ', getDivisionId: async () => null }),
    runCtrl.getById
  );

  router.post(
    '/runs/:id/compute',
    requirePermission({ pool, permissionCode: 'PAYROLL_DRAFT_COMPUTE', getDivisionId: async () => null }),
    runCtrl.compute
  );

  router.post(
    '/runs/:id/review',
    requirePermission({ pool, permissionCode: 'PAYROLL_STATUS_REVIEW', getDivisionId: async () => null }),
    runCtrl.review
  );

  router.post(
    '/runs/:id/lock',
    requirePermission({ pool, permissionCode: 'PAYROLL_STATUS_LOCK', getDivisionId: async () => null }),
    runCtrl.lock
  );

  router.post(
    '/runs/:id/close',
    requirePermission({ pool, permissionCode: 'PAYROLL_STATUS_CLOSE', getDivisionId: async () => null }),
    runCtrl.close
  );

  router.post(
    '/runs/:id/payments',
    requirePermission({ pool, permissionCode: 'PAYROLL_MARK_PAID', getDivisionId: async () => null }),
    runCtrl.markPaid
  );

  router.post(
    '/runs/:id/payslips/generate',
    requireAnyPermission({
      pool,
      permissionCodes: ['PAYSLIP_GENERATE', 'PAYROLL_GENERATE', 'PAYROLL_STATUS_LOCK', 'PAYROLL_MARK_PAID'],
      getDivisionId: async () => null
    }),
    slipCtrl.generateForRun
  );

  router.get(
    '/runs/:id/items',
    requirePermission({ pool, permissionCode: 'PAYROLL_RUN_READ', getDivisionId: async () => null }),
    itemCtrl.list
  );

  router.post(
    '/runs/:id/items',
    requirePermission({ pool, permissionCode: 'PAYROLL_ITEM_ADJUST', getDivisionId: async () => null }),
    itemCtrl.addAdjustment
  );

  router.get(
    '/runs/:id/payslips',
    requirePermission({ pool, permissionCode: 'PAYROLL_RUN_READ', getDivisionId: async () => null }),
    slipCtrl.listForRun
  );

  router.get(
    '/payslips/:id/download',
    requireAnyPermission({
      pool,
      permissionCodes: ['PAYSLIP_VIEW_SELF', 'PAYROLL_RUN_READ', 'PAYSLIP_GENERATE'],
      getDivisionId: async () => null
    }),
    slipCtrl.downloadById
  );

  return router;
}
