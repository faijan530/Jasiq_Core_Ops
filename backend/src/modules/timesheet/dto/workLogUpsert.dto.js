import Joi from 'joi';

export const workLogUpsertSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  workDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  task: Joi.string().trim().min(1).max(500).required(),
  hours: Joi.number().positive().precision(2).required(),
  description: Joi.string().allow('', null),
  projectId: Joi.string().uuid().allow(null)
});
