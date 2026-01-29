import Joi from 'joi';

export const leaveDecisionSchema = Joi.object({
  reason: Joi.string().trim().min(1).required().messages({
    'any.required': 'Reason is required',
    'string.empty': 'Reason is required',
    'string.min': 'Reason is required'
  })
});
