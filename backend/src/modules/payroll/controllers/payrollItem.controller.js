import Joi from 'joi';

import { asyncHandler } from '../../../shared/kernel/asyncHandler.js';
import { validate } from '../../../shared/kernel/validation.js';

import { listPayrollItemsService, addPayrollAdjustmentService } from '../services/payroll.service.js';

const addAdjustmentSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  itemType: Joi.string().valid('ALLOWANCE', 'BONUS', 'DEDUCTION', 'ADJUSTMENT').required(),
  description: Joi.string().trim().min(1).max(200).required(),
  amount: Joi.number().precision(2).required(),
  reason: Joi.string().trim().min(1).max(2000).required()
});

export function payrollItemController({ pool }) {
  return {
    list: asyncHandler(async (req, res) => {
      const items = await listPayrollItemsService(pool, { id: req.params.id });
      res.json({ items });
    }),

    addAdjustment: asyncHandler(async (req, res) => {
      const body = validate(addAdjustmentSchema, req.body);
      const item = await addPayrollAdjustmentService(pool, {
        id: req.params.id,
        employeeId: body.employeeId,
        itemType: body.itemType,
        description: body.description,
        amount: body.amount,
        reason: body.reason,
        actorId: req.auth.userId,
        requestId: req.requestId
      });
      res.status(201).json({ item });
    })
  };
}
