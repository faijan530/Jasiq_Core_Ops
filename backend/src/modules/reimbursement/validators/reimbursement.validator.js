import Joi from 'joi';

export const createDraftSchema = Joi.object({
  claimDate: Joi.date().iso().required(),
  title: Joi.string().trim().max(200).required(),
  description: Joi.string().allow('', null).optional(),
  totalAmount: Joi.number().precision(2).min(0).required()
});

export const updateDraftSchema = Joi.object({
  title: Joi.string().trim().max(200).optional(),
  description: Joi.string().allow('', null).optional(),
  totalAmount: Joi.number().precision(2).min(0).optional(),
  version: Joi.number().integer().min(1).required(),
  monthCloseOverrideReason: Joi.string().trim().allow('', null).optional()
});

export const submitSchema = Joi.object({
  version: Joi.number().integer().min(1).required(),
  monthCloseOverrideReason: Joi.string().trim().allow('', null).optional()
});

export const approveSchema = Joi.object({
  version: Joi.number().integer().min(1).required(),
  decisionReason: Joi.string().trim().allow('', null).optional(),
  monthCloseOverrideReason: Joi.string().trim().allow('', null).optional()
});

export const rejectSchema = Joi.object({
  version: Joi.number().integer().min(1).required(),
  decisionReason: Joi.string().trim().min(1).required(),
  monthCloseOverrideReason: Joi.string().trim().allow('', null).optional()
});

export const addPaymentSchema = Joi.object({
  paidAmount: Joi.number().precision(2).min(0).required(),
  paidAt: Joi.date().iso().required(),
  method: Joi.string().valid('BANK_TRANSFER', 'UPI', 'CASH', 'OTHER').required(),
  referenceId: Joi.string().trim().max(120).allow('', null).optional(),
  note: Joi.string().allow('', null).optional(),
  version: Joi.number().integer().min(1).required(),
  monthCloseOverrideReason: Joi.string().trim().allow('', null).optional()
});

export const closeSchema = Joi.object({
  version: Joi.number().integer().min(1).required(),
  monthCloseOverrideReason: Joi.string().trim().allow('', null).optional()
});

export const uploadReceiptSchema = Joi.object({
  fileName: Joi.string().trim().min(1).max(200).required(),
  contentType: Joi.string().trim().min(1).max(120).required(),
  fileBase64: Joi.string().trim().min(1).required(),
  monthCloseOverrideReason: Joi.string().trim().allow('', null).optional()
});

export const listSchema = Joi.object({
  status: Joi.string().trim().optional(),
  divisionId: Joi.string().trim().optional(),
  month: Joi.string().trim().optional()
});
