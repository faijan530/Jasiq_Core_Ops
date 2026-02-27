import { Router } from 'express';

import { requireAnyPermission, requirePermission } from '../../../shared/kernel/authorization.js';

import { expenseController } from './expense.controller.js';
import { expenseCategoryController } from './expenseCategory.controller.js';

export function expenseRoutes({ pool }) {
  const router = Router();

  const expCtrl = expenseController({ pool });
  const catCtrl = expenseCategoryController({ pool });

  // Categories
  router.get(
    '/expenses/categories',
    requirePermission({ pool, permissionCode: 'EXPENSE_CATEGORY_READ', getDivisionId: async () => null }),
    catCtrl.listActive
  );

  router.post(
    '/expenses/categories',
    requirePermission({ pool, permissionCode: 'EXPENSE_CATEGORY_WRITE', getDivisionId: async () => null }),
    catCtrl.create
  );

  router.patch(
    '/expenses/categories/:id',
    requirePermission({ pool, permissionCode: 'EXPENSE_CATEGORY_WRITE', getDivisionId: async () => null }),
    catCtrl.update
  );

  // Expenses
  router.get(
    '/expenses',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_READ',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    expCtrl.list
  );

  router.post(
    '/expenses',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_CREATE',
      getDivisionId: async (req) => (req.body?.divisionId ? String(req.body.divisionId) : null)
    }),
    expCtrl.create
  );

  router.get(
    '/expenses/:id',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_READ',
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.getById
  );

  router.patch(
    '/expenses/:id',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_UPDATE',
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.update
  );

  router.post(
    '/expenses/:id/submit',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_SUBMIT',
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.submit
  );

  router.post(
    '/expenses/:id/approve',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_APPROVE',
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.approve
  );

  router.post(
    '/expenses/:id/reject',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_REJECT',
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.reject
  );

  router.post(
    '/expenses/:id/mark-paid',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_MARK_PAID',
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.markPaid
  );

  // Receipts
  router.post(
    '/expenses/:id/receipts',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_RECEIPT_UPLOAD',
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.uploadReceipt
  );

  router.get(
    '/expenses/:id/receipts',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_RECEIPT_READ',
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.listReceipts
  );

  router.get(
    '/expenses/:id/receipts/:receiptId/download',
    requireAnyPermission({
      pool,
      permissionCodes: ['EXPENSE_RECEIPT_READ', 'EXPENSE_READ'],
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.downloadReceipt
  );

  // Payments
  router.get(
    '/expenses/:id/payments',
    requirePermission({
      pool,
      permissionCode: 'EXPENSE_READ',
      getDivisionId: async (req) => expCtrl.getDivisionIdForExpense(req.params.id)
    }),
    expCtrl.listPayments
  );

  return router;
}
