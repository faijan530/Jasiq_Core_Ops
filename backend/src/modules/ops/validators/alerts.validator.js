import Joi from 'joi';

export const listAlertsQuerySchema = Joi.object({
  divisionId: Joi.string().uuid().allow('').optional(),
  status: Joi.string().valid('OPEN', 'ACKNOWLEDGED', 'RESOLVED').optional(),
  alertType: Joi.string().trim().max(50).optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(200).default(50)
});
