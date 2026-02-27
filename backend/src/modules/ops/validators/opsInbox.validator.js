import Joi from 'joi';

export const listInboxQuerySchema = Joi.object({
  divisionId: Joi.string().uuid().allow('').optional(),
  limit: Joi.number().integer().min(1).max(200).default(50)
});

export const inboxActionSchema = Joi.object({
  itemType: Joi.string().trim().min(1).max(80).required(),
  entityId: Joi.string().uuid().required(),
  action: Joi.string().trim().min(1).max(80).required(),
  reason: Joi.string().allow('').max(2000).optional()
});
