import { badRequest } from '../../../shared/kernel/errors.js';

export function assertMonthCloseStatus(status) {
  const s = String(status || '').toUpperCase();
  if (s !== 'OPEN' && s !== 'CLOSED') {
    throw badRequest('Invalid status');
  }
  return s;
}
