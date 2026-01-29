import Joi from 'joi';

export const createLeaveTypeSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(1).max(20).required(),
  name: Joi.string().trim().min(1).max(100).required(),
  isPaid: Joi.boolean().required(),
  supportsHalfDay: Joi.boolean().default(true),
  affectsPayroll: Joi.boolean().default(false),
  deductionRule: Joi.string().trim().allow('', null).default(null),
  isActive: Joi.boolean().default(true)
});

export const updateLeaveTypeSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(1).max(20),
  name: Joi.string().trim().min(1).max(100),
  isPaid: Joi.boolean(),
  supportsHalfDay: Joi.boolean(),
  affectsPayroll: Joi.boolean(),
  deductionRule: Joi.string().trim().allow('', null),
  isActive: Joi.boolean(),
  version: Joi.number().integer().min(1).required()
});
