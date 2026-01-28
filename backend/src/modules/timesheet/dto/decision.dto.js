import Joi from 'joi';

export const decisionSchema = Joi.object({
  reason: Joi.string().trim().min(1).required()
});
