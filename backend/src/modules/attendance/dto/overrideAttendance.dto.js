import Joi from 'joi';

export const overrideAttendanceSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  attendanceDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  newStatus: Joi.string().valid('PRESENT', 'ABSENT', 'LEAVE').required(),
  reason: Joi.string().trim().optional().allow('')
});
