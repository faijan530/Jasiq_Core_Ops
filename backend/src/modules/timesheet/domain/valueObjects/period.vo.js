import { badRequest } from '../../../../shared/kernel/errors.js';

export const PERIOD_TYPE = {
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY'
};

export function assertDateOnly(value, label = 'date') {
  const s = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw badRequest(`${label} must be YYYY-MM-DD`);
  return s;
}

export function assertPeriodType(value) {
  const s = String(value || '').toUpperCase();
  if (s !== PERIOD_TYPE.WEEKLY && s !== PERIOD_TYPE.MONTHLY) {
    throw badRequest('Invalid period type');
  }
  return s;
}

export function assertPeriod({ periodType, periodStart, periodEnd }) {
  const pt = assertPeriodType(periodType);
  const ps = assertDateOnly(periodStart, 'periodStart');
  const pe = assertDateOnly(periodEnd, 'periodEnd');
  if (pe < ps) throw badRequest('Invalid period range');
  return { periodType: pt, periodStart: ps, periodEnd: pe };
}
