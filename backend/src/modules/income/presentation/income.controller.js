import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';
import { badRequest } from '../../../shared/kernel/errors.js';

import {
  incomeCreateSchema,
  incomeUpdateSchema,
  incomeListQuerySchema,
  incomeDecisionSchema,
  incomeRejectSchema,
  incomePaymentSchema,
  incomeDocumentUploadSchema
} from './income.validators.js';

import { createIncomeUsecase } from '../application/usecases/createIncome.usecase.js';
import { updateIncomeUsecase } from '../application/usecases/updateIncome.usecase.js';
import { listIncomesUsecase } from '../application/usecases/listIncomes.usecase.js';
import { getIncomeByIdUsecase } from '../application/usecases/getIncomeById.usecase.js';
import { submitIncomeUsecase } from '../application/usecases/submitIncome.usecase.js';
import { approveIncomeUsecase } from '../application/usecases/approveIncome.usecase.js';
import { rejectIncomeUsecase } from '../application/usecases/rejectIncome.usecase.js';
import { markIncomePaidUsecase } from '../application/usecases/markIncomePaid.usecase.js';
import {
  uploadIncomeDocumentUsecase,
  listIncomeDocumentsUsecase,
  downloadIncomeDocumentUsecase
} from '../application/usecases/uploadIncomeDocument.usecase.js';

import { listIncomePaymentsUsecase } from '../application/usecases/markIncomePaid.usecase.js';
import { getIncomeDivisionId } from '../infrastructure/persistence/income.repository.pg.js';

export function incomeController({ pool }) {
  return {
    getDivisionIdForIncome: async (incomeId) => {
      if (!incomeId) return null;
      return getIncomeDivisionId(pool, { id: incomeId });
    },

    list: asyncHandler(async (req, res) => {
      const query = validate(incomeListQuerySchema, req.query);
      const payload = await listIncomesUsecase(pool, { query });
      res.json(payload);
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(incomeCreateSchema, req.body);
      const item = await createIncomeUsecase(pool, { body, actorId: req.auth.userId, requestId: req.requestId });
      res.status(201).json({ item });
    }),

    getById: asyncHandler(async (req, res) => {
      const payload = await getIncomeByIdUsecase(pool, { id: req.params.id });
      res.json(payload);
    }),

    update: asyncHandler(async (req, res) => {
      const body = validate(incomeUpdateSchema, req.body);
      const item = await updateIncomeUsecase(pool, { id: req.params.id, body, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item });
    }),

    submit: asyncHandler(async (req, res) => {
      const body = validate(incomeDecisionSchema, req.body || {});
      const item = await submitIncomeUsecase(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        requestId: req.requestId,
        overrideReason: body.monthCloseOverrideReason
      });
      res.json({ item });
    }),

    approve: asyncHandler(async (req, res) => {
      const body = validate(incomeDecisionSchema, req.body || {});
      const item = await approveIncomeUsecase(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        requestId: req.requestId,
        overrideReason: body.monthCloseOverrideReason
      });
      res.json({ item });
    }),

    reject: asyncHandler(async (req, res) => {
      const body = validate(incomeRejectSchema, req.body || {});
      const item = await rejectIncomeUsecase(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason,
        overrideReason: body.monthCloseOverrideReason
      });
      res.json({ item });
    }),

    markPaid: asyncHandler(async (req, res) => {
      const body = validate(incomePaymentSchema, req.body);
      const payload = await markIncomePaidUsecase(pool, {
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
      const items = await listIncomePaymentsUsecase(pool, { id: req.params.id });
      res.json({ items });
    }),

    uploadDocument: asyncHandler(async (req, res) => {
      const body = validate(incomeDocumentUploadSchema, req.body);
      const item = await uploadIncomeDocumentUsecase(pool, {
        id: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId,
        overrideReason: body.monthCloseOverrideReason
      });
      res.status(201).json({ item });
    }),

    listDocuments: asyncHandler(async (req, res) => {
      const items = await listIncomeDocumentsUsecase(pool, { id: req.params.id });
      res.json({ items });
    }),

    downloadDocument: asyncHandler(async (req, res) => {
      const payload = await downloadIncomeDocumentUsecase(pool, {
        incomeId: req.params.id,
        docId: req.params.docId
      });

      if (!payload?.buffer) throw badRequest('Document not available');

      res.setHeader('Content-Type', payload.contentType || 'application/octet-stream');
      res.setHeader('Content-Length', String(payload.buffer.length));
      res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName || 'document'}"`);
      res.status(200).send(payload.buffer);
    })
  };
}
