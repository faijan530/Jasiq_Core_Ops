import { badRequest } from '../../../../shared/kernel/errors.js';

export function parseHours(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw badRequest('Invalid hours');
  if (n <= 0) throw badRequest('Hours must be greater than 0');
  return Math.round(n * 100) / 100;
}

export function assertMaxHoursPerDay(totalHours, maxHoursPerDay) {
  const max = typeof maxHoursPerDay === 'number' ? maxHoursPerDay : Number(maxHoursPerDay);
  if (!Number.isFinite(max) || max <= 0) throw badRequest('Invalid TIMESHEET_MAX_HOURS_PER_DAY');
  if (totalHours > max + 1e-9) {
    throw badRequest(`Total hours exceed max per day (${max})`);
  }
}
