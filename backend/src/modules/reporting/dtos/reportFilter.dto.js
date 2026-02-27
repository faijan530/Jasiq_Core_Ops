import Joi from 'joi';

import { validate } from '../../../shared/kernel/validation.js';
import { badRequest } from '../../../shared/kernel/errors.js';

const schema = Joi.object({
  from: Joi.date().iso().required(),
  to: Joi.date().iso().required(),
  divisionId: Joi.string().uuid().allow(null, '').optional(),
  categoryId: Joi.string().uuid().allow(null, '').optional(),
  groupBy: Joi.string().valid('MONTH', 'DIVISION', 'CATEGORY').allow(null, '').optional(),
  includePayroll: Joi.boolean().optional()
});

export function toReportFilterDto(input) {
  const v = validate(schema, input);

  const from = new Date(v.from);
  const to = new Date(v.to);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    // Joi should catch this, but keep a strict guard.
    throw badRequest('Invalid date format');
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    divisionId: v.divisionId ? String(v.divisionId) : null,
    categoryId: v.categoryId ? String(v.categoryId) : null,
    groupBy: v.groupBy ? String(v.groupBy) : null,
    includePayroll: typeof v.includePayroll === 'boolean' ? v.includePayroll : null
  };
}
