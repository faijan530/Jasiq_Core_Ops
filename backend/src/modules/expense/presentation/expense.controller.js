import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';
import { badRequest } from '../../../shared/kernel/errors.js';

import {
  expenseCreateSchema,
  expenseUpdateSchema,
  expenseListQuerySchema,
  expenseDecisionSchema,
  expenseRejectSchema,
  expensePaymentSchema,
  receiptUploadSchema
} from './expense.validators.js';

import {
  createExpenseService,
  getExpenseByIdService,
  listExpensesService,
  updateExpenseService
} from '../application/services/expense.service.js';

import { approveExpenseService, rejectExpenseService, submitExpenseService } from '../application/services/expenseApproval.service.js';
import { listExpensePaymentsService, markExpensePaidService } from '../application/services/expensePayment.service.js';

import { uploadExpenseReceiptService, listExpenseReceiptsService, downloadExpenseReceiptService } from '../application/services/expenseReceipt.service.js';

import { getExpenseDivisionId } from '../infrastructure/repositories/expense.repository.js';

export function expenseController({ pool }) {
  return {
    getDivisionIdForExpense: async (expenseId) => {
      if (!expenseId) return null;
      return getExpenseDivisionId(pool, { id: expenseId });
    },

    list: asyncHandler(async (req, res) => {
      const query = validate(expenseListQuerySchema, req.query);
      const payload = await listExpensesService(pool, { query });
      res.json(payload);
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(expenseCreateSchema, req.body);
      const item = await createExpenseService(pool, { body, actorId: req.auth.userId, requestId: req.requestId });
      res.status(201).json({ item });
    }),

    getById: asyncHandler(async (req, res) => {
      const payload = await getExpenseByIdService(pool, { id: req.params.id });
      res.json(payload);
    }),

    update: asyncHandler(async (req, res) => {
      const body = validate(expenseUpdateSchema, req.body);
      const item = await updateExpenseService(pool, { id: req.params.id, body, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item });
    }),

    submit: asyncHandler(async (req, res) => {
      const body = validate(expenseDecisionSchema, req.body || {});
      const item = await submitExpenseService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        requestId: req.requestId,
        overrideReason: body.monthCloseOverrideReason
      });
      res.json({ item });
    }),

    approve: asyncHandler(async (req, res) => {
      const body = validate(expenseDecisionSchema, req.body || {});
      const item = await approveExpenseService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        requestId: req.requestId,
        overrideReason: body.monthCloseOverrideReason
      });
      res.json({ item });
    }),

    reject: asyncHandler(async (req, res) => {
      const body = validate(expenseRejectSchema, req.body || {});
      const item = await rejectExpenseService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason,
        overrideReason: body.monthCloseOverrideReason
      });
      res.json({ item });
    }),

    markPaid: asyncHandler(async (req, res) => {
      const body = validate(expensePaymentSchema, req.body);
      const payload = await markExpensePaidService(pool, {
        id: req.params.id,
        payment: {
          paidAmount: body.paidAmount,
          paidAt: body.paidAt,
          method: body.method,
          referenceId: body.referenceId ? String(body.referenceId).trim() : null
        },
        actorId: req.auth.userId,
        requestId: req.requestId,
        overrideReason: body.monthCloseOverrideReason
      });
      res.json(payload);
    }),

    listPayments: asyncHandler(async (req, res) => {
      const items = await listExpensePaymentsService(pool, { id: req.params.id });
      res.json({ items });
    }),

    uploadReceipt: asyncHandler(async (req, res) => {
      const body = validate(receiptUploadSchema, req.body);
      const item = await uploadExpenseReceiptService(pool, {
        id: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId,
        overrideReason: body.monthCloseOverrideReason
      });
      res.status(201).json({ item });
    }),

    listReceipts: asyncHandler(async (req, res) => {
      const items = await listExpenseReceiptsService(pool, { id: req.params.id });
      res.json({ items });
    }),

    downloadReceipt: asyncHandler(async (req, res) => {
      const payload = await downloadExpenseReceiptService(pool, {
        expenseId: req.params.id,
        receiptId: req.params.receiptId
      });

      if (!payload?.buffer) throw badRequest('Receipt not available');

      res.setHeader('Content-Type', payload.contentType || 'application/octet-stream');
      res.setHeader('Content-Length', String(payload.buffer.length));
      res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName || 'receipt'}"`);
      res.status(200).send(payload.buffer);
    })
  };
}
