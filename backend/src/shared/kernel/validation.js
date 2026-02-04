import { badRequest } from './errors.js';

export function validate(schema, payload) {
  const { value, error } = schema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) {
    console.error('Validation error:', error.details);
    throw badRequest('Validation failed', {
      issues: error.details.map((d) => ({ message: d.message, path: d.path }))
    });
  }
  return value;
}
