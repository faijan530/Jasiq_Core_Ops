import { badRequest } from '../../../shared/kernel/errors.js';
import { assertDateOnly, PERIOD_TYPE } from '../domain/valueObjects/period.vo.js';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parse(iso) {
  const s = assertDateOnly(iso);
  const [y, m, d] = s.split('-').map((x) => Number(x));
  return { y, m, d };
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y, m) {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
  return 31;
}

function dayOfWeek(y, m, d) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let yy = y;
  if (m < 3) yy -= 1;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

function toOrdinal({ y, m, d }) {
  let n = 0;
  for (let yy = 1; yy < y; yy++) n += isLeapYear(yy) ? 366 : 365;
  for (let mm = 1; mm < m; mm++) n += daysInMonth(y, mm);
  n += d - 1;
  return n;
}

function fromOrdinal(n) {
  let y = 1;
  let remaining = n;
  while (true) {
    const dy = isLeapYear(y) ? 366 : 365;
    if (remaining >= dy) {
      remaining -= dy;
      y += 1;
      continue;
    }
    break;
  }

  let m = 1;
  while (true) {
    const dm = daysInMonth(y, m);
    if (remaining >= dm) {
      remaining -= dm;
      m += 1;
      continue;
    }
    break;
  }

  const d = remaining + 1;
  return { y, m, d };
}

function addDays(iso, delta) {
  const base = parse(iso);
  const ord = toOrdinal(base);
  const next = fromOrdinal(ord + delta);
  return `${next.y}-${pad2(next.m)}-${pad2(next.d)}`;
}

export function calculatePeriod({ cycle, dateIso }) {
  const iso = assertDateOnly(dateIso, 'date');
  const c = String(cycle || '').toUpperCase();

  if (c === PERIOD_TYPE.MONTHLY) {
    const { y, m } = parse(iso);
    const last = daysInMonth(y, m);
    return {
      periodType: PERIOD_TYPE.MONTHLY,
      periodStart: `${y}-${pad2(m)}-01`,
      periodEnd: `${y}-${pad2(m)}-${pad2(last)}`
    };
  }

  if (c === PERIOD_TYPE.WEEKLY) {
    const { y, m, d } = parse(iso);
    const dow = dayOfWeek(y, m, d); // 0 Sun..6 Sat
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const start = addDays(iso, mondayOffset);
    const end = addDays(start, 6);
    return {
      periodType: PERIOD_TYPE.WEEKLY,
      periodStart: start,
      periodEnd: end
    };
  }

  throw badRequest('Invalid TIMESHEET_CYCLE');
}
