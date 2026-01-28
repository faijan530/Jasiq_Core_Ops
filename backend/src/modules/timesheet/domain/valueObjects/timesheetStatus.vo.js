import { badRequest } from '../../../../shared/kernel/errors.js';

export const TIMESHEET_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVISION_REQUIRED: 'REVISION_REQUIRED'
};

export function assertTimesheetStatus(value) {
  const s = String(value || '').toUpperCase();
  if (!Object.values(TIMESHEET_STATUS).includes(s)) {
    throw badRequest('Invalid timesheet status');
  }
  return s;
}

export function assertStatusTransition(fromStatus, toStatus) {
  const from = assertTimesheetStatus(fromStatus);
  const to = assertTimesheetStatus(toStatus);

  const allowed = new Map([
    [TIMESHEET_STATUS.DRAFT, new Set([TIMESHEET_STATUS.SUBMITTED])],
    [TIMESHEET_STATUS.SUBMITTED, new Set([TIMESHEET_STATUS.APPROVED, TIMESHEET_STATUS.REJECTED, TIMESHEET_STATUS.REVISION_REQUIRED])],
    [TIMESHEET_STATUS.REVISION_REQUIRED, new Set([TIMESHEET_STATUS.DRAFT])],
    [TIMESHEET_STATUS.REJECTED, new Set([TIMESHEET_STATUS.DRAFT])]
  ]);

  const next = allowed.get(from);
  if (!next || !next.has(to)) {
    throw badRequest(`Invalid status transition: ${from} -> ${to}`);
  }

  return { from, to };
}
