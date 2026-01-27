function pad2(n) {
  return String(n).padStart(2, '0');
}

export function normalizeDateOnly(value) {
  if (!value) return null;

  if (typeof value === 'string') {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  return null;
}

export function todayDateOnlyUtc() {
  return new Date().toISOString().slice(0, 10);
}

export function todayDateOnlyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function isBeforeDate(a, b) {
  if (!a || !b) return false;
  return a < b;
}

export function isAfterDate(a, b) {
  if (!a || !b) return false;
  return a > b;
}

export function isSameDate(a, b) {
  if (!a || !b) return false;
  return a === b;
}

export function buildMonthDays(year, month) {
  const m = String(month).padStart(2, '0');
  const days = [];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${m}-${String(d).padStart(2, '0')}`);
  }
  return days;
}
