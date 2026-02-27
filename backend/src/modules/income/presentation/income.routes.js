import { Router } from 'express';

import { requirePermission } from '../../../shared/kernel/authorization.js';

import { incomeController } from './income.controller.js';
import { incomeCategoryController } from './incomeCategory.controller.js';
import { clientController } from './client.controller.js';

export function incomeRoutes({ pool }) {
  const router = Router();

  const incCtrl = incomeController({ pool });
  const catCtrl = incomeCategoryController({ pool });
  const cliCtrl = clientController({ pool });

  // Income Categories
  router.get(
    '/income/categories',
    requirePermission({ pool, permissionCode: 'INCOME_CATEGORY_READ', getDivisionId: async () => null }),
    catCtrl.listActive
  );

  router.post(
    '/income/categories',
    requirePermission({ pool, permissionCode: 'INCOME_CATEGORY_WRITE', getDivisionId: async () => null }),
    catCtrl.create
  );

  router.patch(
    '/income/categories/:id',
    requirePermission({ pool, permissionCode: 'INCOME_CATEGORY_WRITE', getDivisionId: async () => null }),
    catCtrl.update
  );

  // Clients
  router.get(
    '/income/clients',
    requirePermission({ pool, permissionCode: 'INCOME_CLIENT_READ', getDivisionId: async () => null }),
    cliCtrl.list
  );

  router.post(
    '/income/clients',
    requirePermission({ pool, permissionCode: 'INCOME_CLIENT_WRITE', getDivisionId: async () => null }),
    cliCtrl.create
  );

  router.patch(
    '/income/clients/:id',
    requirePermission({ pool, permissionCode: 'INCOME_CLIENT_WRITE', getDivisionId: async () => null }),
    cliCtrl.update
  );

  // Income
  router.get(
    '/income',
    requirePermission({ pool, permissionCode: 'INCOME_READ', getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null) }),
    incCtrl.list
  );

  router.post(
    '/income',
    requirePermission({ pool, permissionCode: 'INCOME_CREATE', getDivisionId: async (req) => (req.body?.divisionId ? String(req.body.divisionId) : null) }),
    incCtrl.create
  );

  router.get(
    '/income/:id',
    requirePermission({ pool, permissionCode: 'INCOME_READ', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.getById
  );

  router.patch(
    '/income/:id',
    requirePermission({ pool, permissionCode: 'INCOME_UPDATE', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.update
  );

  router.post(
    '/income/:id/submit',
    requirePermission({ pool, permissionCode: 'INCOME_SUBMIT', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.submit
  );

  router.post(
    '/income/:id/approve',
    requirePermission({ pool, permissionCode: 'INCOME_APPROVE', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.approve
  );

  router.post(
    '/income/:id/reject',
    requirePermission({ pool, permissionCode: 'INCOME_REJECT', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.reject
  );

  router.post(
    '/income/:id/mark-paid',
    requirePermission({ pool, permissionCode: 'INCOME_MARK_PAID', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.markPaid
  );

  router.post(
    '/income/:id/documents',
    requirePermission({ pool, permissionCode: 'INCOME_DOCUMENT_UPLOAD', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.uploadDocument
  );

  router.get(
    '/income/:id/documents',
    requirePermission({ pool, permissionCode: 'INCOME_DOCUMENT_READ', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.listDocuments
  );

  router.get(
    '/income/:id/documents/:docId/download',
    requirePermission({ pool, permissionCode: 'INCOME_DOCUMENT_READ', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.downloadDocument
  );

  router.get(
    '/income/:id/payments',
    requirePermission({ pool, permissionCode: 'INCOME_READ', getDivisionId: async (req) => incCtrl.getDivisionIdForIncome(req.params.id) }),
    incCtrl.listPayments
  );

  return router;
}
