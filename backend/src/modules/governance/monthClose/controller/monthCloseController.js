import Joi from 'joi';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';
import { validate } from '../../../../shared/kernel/validation.js';

import { toMonthCloseDto } from '../domain/monthClose.js';
import { listMonthClosesPaged, setMonthCloseStatus } from '../service/monthCloseService.js';

const setStatusSchema = Joi.object({
  month: Joi.date().iso().required(),
  status: Joi.string().valid('OPEN', 'CLOSED').required(),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});

export function monthCloseController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const { rows, total } = await listMonthClosesPaged(pool, { offset, limit });
      res.json(pagedResponse({ items: rows.map(toMonthCloseDto), total, page, pageSize }));
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
