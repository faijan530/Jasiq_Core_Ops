import { badRequest } from '../../../../shared/kernel/errors.js';

function parseIsoDateOnly(dateIso) {
  const s = String(dateIso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw badRequest('Invalid date');
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw badRequest('Invalid date');
  return { s, d };
}

export function calculateAvailableBalance({ openingBalance, grantedBalance, consumedBalance }) {
  const o = Number(openingBalance || 0);
  const g = Number(grantedBalance || 0);
  const c = Number(consumedBalance || 0);
  return Number((o + g - c).toFixed(2));
}

export function calculateLeaveUnits({ startDate, endDate, unit }) {
  const { d: start, s: s1 } = parseIsoDateOnly(startDate);
  const { d: end, s: s2 } = parseIsoDateOnly(endDate);
  if (s1 > s2) throw badRequest('Invalid date range');

  const u = String(unit || '').toUpperCase();
  if (u === 'HALF_DAY') return 0.5;

  let days = 0;
  const cur = new Date(start.getTime());
  while (cur.getTime() <= end.getTime()) {
    days += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}
