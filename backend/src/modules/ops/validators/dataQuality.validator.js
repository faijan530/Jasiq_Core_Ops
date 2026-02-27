import Joi from 'joi';

export const runDataQualitySchema = Joi.object({
  divisionId: Joi.string().uuid().allow('', null).optional()
});

export const listFindingsQuerySchema = Joi.object({
  divisionId: Joi.string().uuid().allow('').optional(),
  status: Joi.string().valid('OPEN', 'ACKNOWLEDGED', 'RESOLVED').optional(),
  findingType: Joi.string().trim().max(80).optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(200).default(50)
});
