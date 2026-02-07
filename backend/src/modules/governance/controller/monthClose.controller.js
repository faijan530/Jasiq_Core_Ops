import Joi from 'joi';

import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { setMonthCloseStatus } from '../service/monthClose.service.js';

const closeSchema = Joi.object({
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
    close: asyncHandler(async (req, res) => {
      const body = validate(closeSchema, req.body);
      const row = await setMonthCloseStatus(pool, {
        month: body.month,
        status: body.status,
        actorId: req.auth.userId,
        requestId: req.requestId,
        reason: body.reason
      });

      res.json({
        item: {
          id: row.id,
          month: row.month,
          status: row.status,
          scope: row.scope,
          closedAt: row.closed_at,
          closedBy: row.closed_by,
          reason: row.closed_reason,
          openedAt: row.opened_at,
          openedBy: row.opened_by,
          createdAt: row.created_at
        }
      });
    })
  };
}
