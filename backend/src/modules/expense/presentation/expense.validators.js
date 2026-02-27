import Joi from 'joi';

export const expenseCategoryCreateSchema = Joi.object({
  code: Joi.string().trim().max(40).required(),
  name: Joi.string().trim().max(120).required(),
  description: Joi.string().allow('').optional()
});

export const expenseCategoryUpdateSchema = Joi.object({
  code: Joi.string().trim().max(40).optional(),
  name: Joi.string().trim().max(120).optional(),
  description: Joi.string().allow('').optional(),
  isActive: Joi.boolean().optional(),
  version: Joi.number().integer().min(1).required()
});

export const expenseCreateSchema = Joi.object({
  expenseDate: Joi.string().trim().required(),
  categoryId: Joi.string().uuid().required(),
  title: Joi.string().trim().max(200).required(),
  description: Joi.string().allow('').optional(),
  amount: Joi.number().precision(2).min(0).required(),
  currency: Joi.string().trim().max(10).optional(),
  divisionId: Joi.string().uuid().allow(null).optional(),
  projectId: Joi.string().uuid().allow(null).optional(),
  paidByMethod: Joi.string().valid('BANK_TRANSFER', 'UPI', 'CASH', 'CARD', 'OTHER').required(),
  vendorName: Joi.string().trim().max(200).allow('').optional(),
  isReimbursement: Joi.boolean().default(false),
  employeeId: Joi.string().uuid().allow(null).optional(),
  monthCloseOverrideReason: Joi.string().allow('').max(2000).optional()
});

export const expenseUpdateSchema = Joi.object({
  expenseDate: Joi.string().trim().optional(),
  categoryId: Joi.string().uuid().optional(),
  title: Joi.string().trim().max(200).optional(),
  description: Joi.string().allow('').optional(),
  amount: Joi.number().precision(2).min(0).optional(),
  currency: Joi.string().trim().max(10).optional(),
  divisionId: Joi.string().uuid().allow(null).optional(),
  projectId: Joi.string().uuid().allow(null).optional(),
  paidByMethod: Joi.string().valid('BANK_TRANSFER', 'UPI', 'CASH', 'CARD', 'OTHER').optional(),
  vendorName: Joi.string().trim().max(200).allow('').optional(),
  isReimbursement: Joi.boolean().optional(),
  employeeId: Joi.string().uuid().allow(null).optional(),
  version: Joi.number().integer().min(1).required(),
  monthCloseOverrideReason: Joi.string().allow('').max(2000).optional()
});

export const expenseListQuerySchema = Joi.object({
  status: Joi.string().trim().optional(),
  divisionId: Joi.string().uuid().optional(),
  categoryId: Joi.string().uuid().optional(),
  from: Joi.string().trim().optional(),
  to: Joi.string().trim().optional(),
  minAmount: Joi.number().precision(2).min(0).optional(),
  maxAmount: Joi.number().precision(2).min(0).optional(),
  reimbursement: Joi.boolean().optional(),
  search: Joi.string().trim().allow('').optional(),
  page: Joi.number().integer().min(1).default(1),
  size: Joi.number().integer().min(1).max(200).default(20)
});

export const expenseDecisionSchema = Joi.object({
  reason: Joi.string().trim().max(2000).allow('').optional(),
  monthCloseOverrideReason: Joi.string().trim().max(2000).allow('').optional()
});

export const expenseRejectSchema = Joi.object({
  reason: Joi.string().trim().max(2000).required(),
  monthCloseOverrideReason: Joi.string().trim().max(2000).allow('').optional()
});

export const expensePaymentSchema = Joi.object({
  paidAmount: Joi.number().precision(2).positive().required(),
  paidAt: Joi.date().required(),
  method: Joi.string().valid('BANK_TRANSFER', 'UPI', 'CASH', 'CARD', 'OTHER').required(),
  referenceId: Joi.string().trim().max(120).allow('').optional(),
  monthCloseOverrideReason: Joi.string().trim().max(2000).allow('').optional()
});

export const receiptUploadSchema = Joi.object({
  fileName: Joi.string().trim().max(200).required(),
  contentType: Joi.string().trim().max(120).required(),
  fileBase64: Joi.string().trim().required(),
  monthCloseOverrideReason: Joi.string().trim().max(2000).allow('').optional()
});
