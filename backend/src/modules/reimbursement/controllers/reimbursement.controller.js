import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';
import { parsePagination } from '../../../shared/kernel/pagination.js';

import {
  createDraftSchema,
  updateDraftSchema,
  uploadReceiptSchema,
  submitSchema,
  approveSchema,
  rejectSchema,
  addPaymentSchema,
  closeSchema,
  listSchema
} from '../validators/reimbursement.validator.js';

import {
  createDraftService,
  updateDraftService,
  uploadReceiptService,
  submitService,
  approveService,
  rejectService,
  addPaymentService,
  closeService,
  listMyReimbursementsService,
  listReimbursementsService,
  getByIdService,
  listReceiptsService,
  downloadReceiptService,
  listPaymentsService
} from '../services/reimbursement.service.js';

import { getDivisionIdForReimbursement } from '../repositories/reimbursement.repository.js';

export function reimbursementController({ pool }) {
  return {
    getDivisionIdForReimbursement: async (id) => {
      const divisionId = await getDivisionIdForReimbursement(pool, { id });
      return divisionId ? String(divisionId) : null;
    },

    createDraft: asyncHandler(async (req, res) => {
      const body = validate(createDraftSchema, req.body);
      const item = await createDraftService(pool, {
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json({ item });
    }),

    updateDraft: asyncHandler(async (req, res) => {
      const body = validate(updateDraftSchema, req.body);
      const item = await updateDraftService(pool, {
        id: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json({ item });
    }),

    uploadReceipt: asyncHandler(async (req, res) => {
      const body = validate(uploadReceiptSchema, req.body);
      const item = await uploadReceiptService(pool, {
        id: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json({ item });
    }),

    submit: asyncHandler(async (req, res) => {
      const body = validate(submitSchema, req.body);
      const item = await submitService(pool, {
        id: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json({ item });
    }),

    approve: asyncHandler(async (req, res) => {
      const body = validate(approveSchema, req.body);
      const item = await approveService(pool, {
        id: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json({ item });
    }),

    reject: asyncHandler(async (req, res) => {
      const body = validate(rejectSchema, req.body);
      const item = await rejectService(pool, {
        id: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json({ item });
    }),

    addPayment: asyncHandler(async (req, res) => {
      const body = validate(addPaymentSchema, req.body);
      const item = await addPaymentService(pool, {
        id: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json({ item });
    }),

    close: asyncHandler(async (req, res) => {
      const body = validate(closeSchema, req.body);
      const item = await closeService(pool, {
        id: req.params.id,
        body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json({ item });
    }),

    listMy: asyncHandler(async (req, res) => {
      validate(listSchema, req.query);
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const payload = await listMyReimbursementsService(pool, {
        actorId: req.auth.userId,
        query: req.query,
        offset,
        limit,
        page,
        pageSize
      });
      res.json(payload);
    }),

    list: asyncHandler(async (req, res) => {
      validate(listSchema, req.query);
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const payload = await listReimbursementsService(pool, {
        actorId: req.auth.userId,
        query: req.query,
        offset,
        limit,
        page,
        pageSize
      });
      res.json(payload);
    }),

    getById: asyncHandler(async (req, res) => {
      const payload = await getByIdService(pool, {
        id: req.params.id,
        actorId: req.auth.userId
      });
      res.json(payload);
    }),

    listReceipts: asyncHandler(async (req, res) => {
      const items = await listReceiptsService(pool, {
        id: req.params.id,
        actorId: req.auth.userId
      });
      res.json({ items });
    }),

    downloadReceipt: asyncHandler(async (req, res) => {
      const payload = await downloadReceiptService(pool, {
        reimbursementId: req.params.id,
        receiptId: req.params.receiptId,
        actorId: req.auth.userId
      });

      res.setHeader('Content-Type', payload.contentType || 'application/octet-stream');
      res.setHeader('Content-Length', String(payload.buffer.length));
      res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName || 'receipt'}"`);
      res.status(200).send(payload.buffer);
    }),

    listPayments: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const payload = await listPaymentsService(pool, {
        id: req.params.id,
        actorId: req.auth.userId,
        offset,
        limit,
        page,
        pageSize
      });
      res.json(payload);
    })
  };
}
