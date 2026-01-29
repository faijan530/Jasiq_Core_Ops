import { badRequest } from '../../../../shared/kernel/errors.js';

export const LEAVE_UNIT = Object.freeze({
  FULL_DAY: 'FULL_DAY',
  HALF_DAY: 'HALF_DAY'
});

export const HALF_DAY_PART = Object.freeze({
  AM: 'AM',
  PM: 'PM'
});

export function assertLeaveUnit(unit) {
  const u = String(unit || '').toUpperCase();
  if (!Object.values(LEAVE_UNIT).includes(u)) throw badRequest('Invalid leave unit');
  return u;
}

export function normalizeHalfDayPart(part) {
  if (part === null || part === undefined || part === '') return null;
  const p = String(part || '').toUpperCase();
  if (!Object.values(HALF_DAY_PART).includes(p)) throw badRequest('Invalid half day part');
  return p;
}
