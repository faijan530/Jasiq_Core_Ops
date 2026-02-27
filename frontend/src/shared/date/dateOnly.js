// src/shared/date/dateOnly.js

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

export function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return null;
}

// Get current date in IST timezone (UTC+5:30)
export function getCurrentDateInIST() {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset + (now.getTimezoneOffset() * 60 * 1000));
  return istTime.toISOString().split('T')[0];
}

// Get current month in IST timezone (YYYY-MM format)
export function getCurrentMonthInIST() {
  return getCurrentDateInIST().slice(0, 7);
}

// Format date for display in IST
export function formatDateInIST(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00.000+05:30');
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}

export function buildMonthDays(year, monthIndex) {
  const days = [];
  const m = monthIndex + 1;
  const last = daysInMonth(year, m);
  for (let d = 1; d <= last; d++) {
    days.push(`${year}-${pad2(m)}-${pad2(d)}`);
  }
  return days;
}
