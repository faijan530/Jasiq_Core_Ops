// src/shared/date/monthDays.js

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y, m) {
  // m: 1-12
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
  return 31;
}

export function getMonthDays(year, monthIndex) {
  const days = [];
  const m = monthIndex + 1;
  const last = daysInMonth(year, m);
  for (let d = 1; d <= last; d++) {
    days.push(`${year}-${pad2(m)}-${pad2(d)}`);
  }
  return days;
}
