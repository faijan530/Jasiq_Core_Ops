import Joi from 'joi';

import { asyncHandler } from '../../../../shared/kernel/asyncHandler.js';
import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';
import { validate } from '../../../../shared/kernel/validation.js';

import { listMonthClosesPaged, setMonthCloseStatus } from '../../../governance/monthClose/service/monthCloseService.js';
import { toMonthCloseDto } from '../../../governance/monthClose/domain/monthClose.js';

const closeSchema = Joi.object({
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});

export function financeMonthCloseController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { offset, limit, page, pageSize } = parsePagination(req.query);
      const { rows, total } = await listMonthClosesPaged(pool, { offset, limit });
      res.json(pagedResponse({ items: rows.map(toMonthCloseDto), total, page, pageSize }));
    }),

    close: asyncHandler(async (req, res) => {
      const body = validate(closeSchema, req.body);
      const month = String(req.params.month || '').trim();
      const row = await setMonthCloseStatus(pool, {
        month,
        scope: 'COMPANY',
        status: 'CLOSED',
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });
      res.json({ item: toMonthCloseDto(row) });
    })
  };
}
