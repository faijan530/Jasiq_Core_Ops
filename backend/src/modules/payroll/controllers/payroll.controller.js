import Joi from 'joi';

import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import {
  createPayrollRunService,
  listPayrollRunsService,
  getPayrollRunByIdService,
  computePayrollDraftService,
  reviewPayrollRunService,
  lockPayrollRunService,
  markPayrollPaidService,
  closePayrollRunService
} from '../services/payroll.service.js';

const listQuerySchema = Joi.object({
  fromMonth: Joi.string().trim().optional(),
  toMonth: Joi.string().trim().optional(),
  status: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(200).default(50)
});

const createSchema = Joi.object({
  month: Joi.string().trim().required(),
  notes: Joi.string().allow('').max(2000).optional()
});

const paymentSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  paidAmount: Joi.number().precision(2).positive().required(),
  paidAt: Joi.date().required(),
  method: Joi.string().valid('BANK_TRANSFER', 'UPI', 'CASH', 'OTHER').required(),
  referenceId: Joi.string().allow('').max(120).optional()
});

export function payrollController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const query = validate(listQuerySchema, req.query);
      const payload = await listPayrollRunsService(pool, { query });
      res.json(payload);
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(createSchema, req.body);
      const item = await createPayrollRunService(pool, {
        month: body.month,
        notes: body.notes || null,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json({ item });
    }),

    getById: asyncHandler(async (req, res) => {
      const item = await getPayrollRunByIdService(pool, { id: req.params.id });
      res.json({ item });
    }),

    compute: asyncHandler(async (req, res) => {
      const item = await computePayrollDraftService(pool, { id: req.params.id, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item });
    }),

    review: asyncHandler(async (req, res) => {
      const item = await reviewPayrollRunService(pool, { id: req.params.id, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item });
    }),

    lock: asyncHandler(async (req, res) => {
      const item = await lockPayrollRunService(pool, { id: req.params.id, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item });
    }),

    close: asyncHandler(async (req, res) => {
      const item = await closePayrollRunService(pool, { id: req.params.id, actorId: req.auth.userId, requestId: req.requestId });
      res.json({ item });
    }),

    markPaid: asyncHandler(async (req, res) => {
      const body = validate(paymentSchema, req.body);
      const item = await markPayrollPaidService(pool, {
        id: req.params.id,
        payment: {
          employeeId: body.employeeId,
          paidAmount: body.paidAmount,
          paidAt: body.paidAt,
          method: body.method,
          referenceId: body.referenceId ? String(body.referenceId).trim() : null
        },
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json({ item });
    })
  };
}
