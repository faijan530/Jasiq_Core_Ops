import Joi from 'joi';

export const overrideAttendanceSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  attendanceDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  status: Joi.string().valid('PRESENT', 'ABSENT', 'LEAVE').required(),
  source: Joi.string().valid('HR', 'SYSTEM', 'SELF').required(),
  note: Joi.string().allow('', null),
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});
