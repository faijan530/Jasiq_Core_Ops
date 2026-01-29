import Joi from 'joi';

export const grantLeaveBalanceSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  leaveTypeId: Joi.string().uuid().required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
  openingBalance: Joi.number().min(0).precision(2).default(0),
  grantAmount: Joi.number().min(0).precision(2).default(0),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});
