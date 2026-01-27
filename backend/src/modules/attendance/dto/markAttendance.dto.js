import Joi from 'joi';

export const markAttendanceSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  attendanceDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  status: Joi.string().valid('PRESENT', 'ABSENT', 'LEAVE').required(),
  source: Joi.string().valid('HR', 'SYSTEM', 'SELF').required(),
  note: Joi.string().allow('', null),
  reason: Joi.string().allow('', null)
});
