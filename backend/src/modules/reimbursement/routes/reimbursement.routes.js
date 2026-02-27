import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { requireAnyPermission, requirePermission } from '../../../shared/kernel/authorization.js';

import { reimbursementController } from '../controllers/reimbursement.controller.js';

export function reimbursementRoutes({ pool }) {
  const router = Router();
  const ctrl = reimbursementController({ pool });

  async function inferDivisionIdFromUserRole(req) {
    try {
      if (req.query?.divisionId) return String(req.query.divisionId);
      const userId = req.auth?.userId;
      if (!userId) return null;

      const res = await pool.query(
        `SELECT ur.division_id
         FROM user_role ur
         WHERE ur.user_id = $1
           AND ur.scope = 'DIVISION'
           AND ur.division_id IS NOT NULL
         ORDER BY ur.division_id ASC
         LIMIT 1`,
        [userId]
      );

      return res.rows[0]?.division_id || null;
    } catch {
      return null;
    }
  }

  const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
  const paymentLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

  // Employee
  router.post(
    '/draft',
    requirePermission({ pool, permissionCode: 'REIMBURSEMENT_CREATE_SELF', getDivisionId: async () => null }),
    ctrl.createDraft
  );

  router.patch(
    '/:id',
    requirePermission({ pool, permissionCode: 'REIMBURSEMENT_EDIT_SELF_DRAFT', getDivisionId: async () => null }),
    ctrl.updateDraft
  );

  router.post(
    '/:id/receipts',
    uploadLimiter,
    requirePermission({ pool, permissionCode: 'REIMBURSEMENT_EDIT_SELF_DRAFT', getDivisionId: async () => null }),
    ctrl.uploadReceipt
  );

  router.post(
    '/:id/submit',
    requirePermission({ pool, permissionCode: 'REIMBURSEMENT_SUBMIT_SELF', getDivisionId: async () => null }),
    ctrl.submit
  );

  router.get(
    '/my',
    requirePermission({ pool, permissionCode: 'REIMBURSEMENT_VIEW_SELF', getDivisionId: async () => null }),
    ctrl.listMy
  );

  router.get(
    '/:id',
    requireAnyPermission({
      pool,
      permissionCodes: ['REIMBURSEMENT_VIEW_SELF', 'REIMBURSEMENT_VIEW_DIVISION'],
      getDivisionId: async (req) => ctrl.getDivisionIdForReimbursement(req.params.id)
    }),
    ctrl.getById
  );

  // Manager/Finance
  router.get(
    '/',
    async (req, res, next) => {
      const inferred = await inferDivisionIdFromUserRole(req);
      if (inferred && !req.query?.divisionId) {
        req.query.divisionId = inferred;
      }
      next();
    },
    requirePermission({
      pool,
      permissionCode: 'REIMBURSEMENT_VIEW_DIVISION',
      getDivisionId: async (req) => (req.query?.divisionId ? String(req.query.divisionId) : null)
    }),
    ctrl.list
  );

  router.post(
    '/:id/approve',
    requirePermission({ pool, permissionCode: 'REIMBURSEMENT_APPROVE', getDivisionId: async (req) => ctrl.getDivisionIdForReimbursement(req.params.id) }),
    ctrl.approve
  );

  router.post(
    '/:id/reject',
    requirePermission({ pool, permissionCode: 'REIMBURSEMENT_REJECT', getDivisionId: async (req) => ctrl.getDivisionIdForReimbursement(req.params.id) }),
    ctrl.reject
  );

  router.post(
    '/:id/payments',
    paymentLimiter,
    requirePermission({ pool, permissionCode: 'REIMBURSEMENT_ADD_PAYMENT', getDivisionId: async (req) => ctrl.getDivisionIdForReimbursement(req.params.id) }),
    ctrl.addPayment
  );

  router.post(
    '/:id/close',
    requirePermission({ pool, permissionCode: 'REIMBURSEMENT_CLOSE', getDivisionId: async (req) => ctrl.getDivisionIdForReimbursement(req.params.id) }),
    ctrl.close
  );

  router.get(
    '/:id/receipts',
    requireAnyPermission({
      pool,
      permissionCodes: ['REIMBURSEMENT_VIEW_SELF', 'REIMBURSEMENT_VIEW_DIVISION'],
      getDivisionId: async (req) => ctrl.getDivisionIdForReimbursement(req.params.id)
    }),
    ctrl.listReceipts
  );

  router.get(
    '/:id/payments',
    requireAnyPermission({
      pool,
      permissionCodes: ['REIMBURSEMENT_VIEW_SELF', 'REIMBURSEMENT_VIEW_DIVISION'],
      getDivisionId: async (req) => ctrl.getDivisionIdForReimbursement(req.params.id)
    }),
    ctrl.listPayments
  );

  router.get(
    '/:id/receipts/:receiptId/download',
    requireAnyPermission({
      pool,
      permissionCodes: ['REIMBURSEMENT_VIEW_SELF', 'REIMBURSEMENT_VIEW_DIVISION'],
      getDivisionId: async (req) => ctrl.getDivisionIdForReimbursement(req.params.id)
    }),
    ctrl.downloadReceipt
  );

  return router;
}
