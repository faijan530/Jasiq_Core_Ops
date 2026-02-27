import Joi from 'joi';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';
import { validate } from '../../../../shared/kernel/validation.js';

import { toMonthCloseDto } from '../domain/monthClose.js';
import {
  listMonthClosesPaged,
  setMonthCloseStatus,
  getMonthCloseStatus,
  previewMonth,
  closeMonth,
  createAdjustmentService,
  listAdjustmentsService,
  listSnapshotsService
} from '../service/monthCloseService.js';

const setStatusSchema = Joi.object({
  month: Joi.date().iso().required(),
  status: Joi.string().valid('OPEN', 'CLOSED').required(),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});

const getMonthSchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional()
});

const previewSchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required()
});

const closeSchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});

const createAdjustmentSchema = Joi.object({
  adjustmentDate: Joi.date().iso().required(),
  targetMonth: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  targetType: Joi.string().valid('EXPENSE', 'INCOME', 'PAYROLL', 'SETTLEMENT', 'REIMBURSEMENT').required(),
  targetId: Joi.string().guid({ version: 'uuidv4' }).optional(),
  divisionId: Joi.string().guid({ version: 'uuidv4' }).optional(),
  direction: Joi.string().valid('INCREASE', 'DECREASE').required(),
  amount: Joi.number().positive().required(),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});

const listAdjustmentsSchema = Joi.object({
  targetMonth: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(),
  divisionId: Joi.string().guid({ version: 'uuidv4' }).optional(),
  type: Joi.string().valid('EXPENSE', 'INCOME', 'PAYROLL', 'SETTLEMENT', 'REIMBURSEMENT').optional()
});

const listSnapshotsSchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(),
  scope: Joi.string().valid('COMPANY').optional()
});

export function monthCloseController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const query = validate(getMonthSchema, req.query);
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      
      if (query.month) {
        // Get specific month status
        const result = await getMonthCloseStatus(pool, { month: query.month, scope: 'COMPANY' });
        res.json(result);
      } else {
        // Get paginated list
        const { rows, total } = await listMonthClosesPaged(pool, { offset, limit });
        res.json(pagedResponse({ items: rows.map(toMonthCloseDto), total, page, pageSize }));
      }
    }),

    preview: asyncHandler(async (req, res) => {
      const query = validate(previewSchema, req.query);
      const result = await previewMonth(pool, {
        month: query.month,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json(result);
    }),

    close: asyncHandler(async (req, res) => {
      const body = validate(closeSchema, req.body);
      const result = await closeMonth(pool, {
        month: body.month,
        reason: body.reason,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json(result);
    }),

    createAdjustment: asyncHandler(async (req, res) => {
      const body = validate(createAdjustmentSchema, req.body);
      const result = await createAdjustmentService(pool, {
        payload: body,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.json(result);
    }),

    listAdjustments: asyncHandler(async (req, res) => {
      const query = validate(listAdjustmentsSchema, req.query);
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const result = await listAdjustmentsService(pool, { query, offset, limit, page, pageSize });
      res.json(pagedResponse({ items: result.items, total: result.total, page, pageSize }));
    }),

    listSnapshots: asyncHandler(async (req, res) => {
      const query = validate(listSnapshotsSchema, req.query);
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const result = await listSnapshotsService(pool, { query, offset, limit, page, pageSize });
      res.json(pagedResponse({ items: result.items, total: result.total, page, pageSize }));
    }),

    setStatus: asyncHandler(async (req, res) => {
      const body = validate(setStatusSchema, req.body);
      const row = await setMonthCloseStatus(pool, {
        month: body.month,
        scope: 'COMPANY',
        status: body.status,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });
      res.json({ item: toMonthCloseDto(row) });
    })
  };
}
