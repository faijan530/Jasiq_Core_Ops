import Joi from 'joi';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../../shared/kernel/validation.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';
import { notFound } from '../../../../shared/kernel/errors.js';

import { toDivisionDto } from '../domain/division.js';
import { createDivision, getDivision, listDivisionsPaged, setDivisionActive } from '../service/divisionService.js';

const createSchema = Joi.object({
  code: Joi.string().max(20).required(),
  name: Joi.string().max(100).required(),
  type: Joi.string().valid('REVENUE', 'INTERNAL').default('INTERNAL'),
  description: Joi.string().allow('', null),
  reason: Joi.string().allow('', null)
});

const setActiveSchema = Joi.object({
  isActive: Joi.boolean().required(),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});

export function divisionController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const { rows, total } = await listDivisionsPaged(pool, { offset, limit });
      res.json(pagedResponse({
        items: rows.map(toDivisionDto),
        total,
        page,
        pageSize
      }));
    }),

    getById: asyncHandler(async (req, res) => {
      const row = await getDivision(pool, req.params.id);
      if (!row) throw notFound('Division not found');
      res.json({ item: toDivisionDto(row) });
    }),

    create: asyncHandler(async (req, res) => {
      const body = validate(createSchema, req.body);
      const created = await createDivision(pool, {
        code: body.code,
        name: body.name,
        type: body.type,
        description: body.description,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });
      res.status(201).json({ item: toDivisionDto(created) });
    }),

    setActive: asyncHandler(async (req, res) => {
      const body = validate(setActiveSchema, req.body);
      const updated = await setDivisionActive(pool, {
        id: req.params.id,
        isActive: body.isActive,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });
      res.json({ item: toDivisionDto(updated) });
    })
  };
}
