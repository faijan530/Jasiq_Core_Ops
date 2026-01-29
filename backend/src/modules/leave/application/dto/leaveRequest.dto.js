import Joi from 'joi';

export const createLeaveRequestSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  leaveTypeId: Joi.string().uuid().required(),
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  unit: Joi.string().valid('FULL_DAY', 'HALF_DAY').required(),
  halfDayPart: Joi.string().valid('AM', 'PM').allow(null),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});

export const listLeaveRequestsQuerySchema = Joi.object({
  employeeId: Joi.string().uuid().optional(),
  status: Joi.string().valid('SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED').optional(),
  divisionId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(200).optional()
});

export const listLeaveBalancesQuerySchema = Joi.object({
  employeeId: Joi.string().uuid().optional(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(200).optional()
});
