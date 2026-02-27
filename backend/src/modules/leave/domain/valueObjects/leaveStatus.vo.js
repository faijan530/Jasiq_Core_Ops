import { badRequest } from '../../../../shared/kernel/errors.js';

export const LEAVE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_L1: 'PENDING_L1',
  PENDING_L2: 'PENDING_L2',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
});

export function assertLeaveStatus(status) {
  const s = String(status || '').toUpperCase();
  
  // Backward compatibility: treat SUBMITTED as PENDING_L1
  if (s === 'SUBMITTED') {
    return LEAVE_STATUS.PENDING_L1;
  }
  
  if (!Object.values(LEAVE_STATUS).includes(s)) {
    throw badRequest('Invalid leave status');
  }
  return s;
}

// Helper function to map old status to new status
export function mapLegacyStatus(status) {
  switch (status) {
    case 'SUBMITTED':
      return LEAVE_STATUS.PENDING_L1;
    case 'DRAFT':
    case 'PENDING_L1':
    case 'PENDING_L2':
    case 'APPROVED':
    case 'REJECTED':
    case 'CANCELLED':
      return status;
    default:
      return status;
  }
}
