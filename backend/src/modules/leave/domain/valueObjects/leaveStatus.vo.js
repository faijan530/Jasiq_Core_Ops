import { badRequest } from '../../../../shared/kernel/errors.js';

export const LEAVE_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
});

export function assertLeaveStatus(status) {
  const s = String(status || '').toUpperCase();
  if (!Object.values(LEAVE_STATUS).includes(s)) {
    throw badRequest('Invalid leave status');
  }
  return s;
}
