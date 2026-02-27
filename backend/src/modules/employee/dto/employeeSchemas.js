import Joi from 'joi';

export const createEmployeeSchema = Joi.object({
  employeeCode: Joi.string().trim().max(30).required(),
  firstName: Joi.string().trim().max(100).required(),
  lastName: Joi.string().trim().max(100).required(),
  designation: Joi.string().trim().max(100).allow('', null),
  email: Joi.string().trim().max(200).allow('', null),
  phone: Joi.string().trim().max(50).allow('', null),
  password: Joi.string().min(8).required(),
  status: Joi.string().valid('ACTIVE', 'ON_HOLD', 'EXITED').required(),
  scope: Joi.string().valid('COMPANY', 'DIVISION').required(),
  primaryDivisionId: Joi.when('scope', {
    is: 'DIVISION',
    then: Joi.string().uuid().required().messages({
      'any.required': 'primaryDivisionId is required',
      'string.empty': 'primaryDivisionId is required'
    }),
    otherwise: Joi.string().allow(null, '')
  }),
  reportingManagerId: Joi.string().uuid().allow(null, ''),
  roleId: Joi.string().valid('EMPLOYEE', 'HR_ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'FOUNDER').required(),
  reason: Joi.string().allow('', null)
});

export const updateEmployeeSchema = Joi.object({
  firstName: Joi.string().trim().max(100).allow('', null),
  lastName: Joi.string().trim().max(100).allow('', null),
  email: Joi.string().trim().max(200).allow('', null),
  phone: Joi.string().trim().max(50).allow('', null),
  roles: Joi.array().items(Joi.string().valid('EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'FINANCE_ADMIN')).min(1),
  reason: Joi.string().allow('', null)
});

export const changeScopeSchema = Joi.object({
  scope: Joi.string().valid('COMPANY', 'DIVISION').required(),
  primaryDivisionId: Joi.when('scope', {
    is: 'DIVISION',
    then: Joi.string().uuid().required().messages({
      'any.required': 'primaryDivisionId is required',
      'string.empty': 'primaryDivisionId is required'
    }),
    otherwise: Joi.string().allow(null, '')
  }),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});

export const changeStatusSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'ON_HOLD', 'EXITED').required(),
  reason: Joi.string().allow('', null)
});

export const addCompensationSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().uppercase().length(3).required(),
  frequency: Joi.string().valid('HOURLY', 'MONTHLY', 'ANNUAL').required(),
  effectiveFrom: Joi.date().iso().required(),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});

export const uploadDocumentSchema = Joi.object({
  documentType: Joi.string().trim().max(50).required(),
  fileName: Joi.string().trim().max(260).required(),
  storageKey: Joi.string().trim().min(1).required(),
  mimeType: Joi.string().trim().max(120).allow('', null),
  sizeBytes: Joi.number().integer().min(0).allow(null),
  reason: Joi.string().allow('', null)
});
