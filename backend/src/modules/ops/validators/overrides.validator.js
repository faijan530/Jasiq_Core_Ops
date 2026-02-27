import Joi from 'joi';

export const createOverrideSchema = Joi.object({
  overrideType: Joi.string().trim().max(50).required(),
  divisionId: Joi.string().uuid().allow('', null).optional(),
  targetEntityType: Joi.string().trim().max(50).required(),
  targetEntityId: Joi.string().uuid().required(),
  requestedAction: Joi.string().trim().max(80).required(),
  reason: Joi.string().trim().min(1).max(5000).required()
});

export const listOverridesQuerySchema = Joi.object({
  divisionId: Joi.string().uuid().allow('').optional(),
  status: Joi.string().valid('REQUESTED', 'APPROVED', 'REJECTED', 'EXECUTED').optional(),
  overrideType: Joi.string().trim().max(50).optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(200).default(50)
});

export const approveOverrideSchema = Joi.object({
  approvalReason: Joi.string().trim().min(1).max(5000).required()
});

export const rejectOverrideSchema = Joi.object({
  approvalReason: Joi.string().trim().min(1).max(5000).required()
});

export const executeOverrideSchema = Joi.object({
  reason: Joi.string().allow('').max(5000).optional()
});
