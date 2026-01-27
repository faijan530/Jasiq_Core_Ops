import Joi from 'joi';

export const bulkMarkAttendanceSchema = Joi.object({
  attendanceDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  source: Joi.string().valid('HR', 'SYSTEM', 'SELF').required(),
  items: Joi.array()
    .items(
      Joi.object({
        employeeId: Joi.string().uuid().required(),
        status: Joi.string().valid('PRESENT', 'ABSENT', 'LEAVE').required(),
        note: Joi.string().allow('', null),
        reason: Joi.string().allow('', null)
      })
    )
    .min(1)
    .max(500)
    .required()
});
