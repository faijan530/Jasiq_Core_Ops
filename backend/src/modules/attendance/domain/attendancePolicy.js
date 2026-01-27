import { badRequest, forbidden, notFound } from '../../../shared/kernel/errors.js';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function assertDateOnlyString(value, label = 'attendanceDate') {
  const s = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw badRequest(`${label} must be YYYY-MM-DD`);
  }
  return s;
}

function parseDateOnly(iso) {
  const s = assertDateOnlyString(iso);
  const [y, m, d] = s.split('-').map((x) => Number(x));
  return { y, m, d };
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

function toDateOnlyFromTimestampString(value) {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function toDateOnlyFromTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'string') return toDateOnlyFromTimestampString(value);
  return null;
}

function monthEndIso(isoDate) {
  const { y, m } = parseDateOnly(isoDate);
  const last = daysInMonth(y, m);
  return `${y}-${pad2(m)}-${pad2(last)}`;
}

export function normalizeAttendanceDate(attendanceDate) {
  return assertDateOnlyString(attendanceDate);
}

export function assertAttendanceStatus(status) {
  const s = String(status || '').toUpperCase();
  if (s !== 'PRESENT' && s !== 'ABSENT' && s !== 'LEAVE') {
    throw badRequest('Invalid attendance status');
  }
}

export function assertAttendanceSource(source) {
  const s = String(source || '').toUpperCase();
  if (s !== 'HR' && s !== 'SYSTEM' && s !== 'SELF') {
    throw badRequest('Invalid attendance source');
  }
}

export function assertEmployeeActive(employee) {
  if (!employee) throw notFound('Employee not found');
  if (employee.status !== 'ACTIVE') {
    throw badRequest('Only ACTIVE employees can be marked');
  }
}

export function assertAttendanceDateAllowed(attendanceDate, { todayDate }) {
  const ad = assertDateOnlyString(attendanceDate);
  const td = assertDateOnlyString(todayDate, 'todayDate');

  if (ad !== td) {
    if (ad < td) throw badRequest('Past dates are not allowed');
    throw badRequest('Future dates are not allowed');
  }
}

export function assertWithinEmploymentPeriod(employee, attendanceDate) {
  const ad = assertDateOnlyString(attendanceDate);
  const joining =
    (employee && typeof employee.joining_date === 'string' ? assertDateOnlyString(employee.joining_date, 'joiningDate') : null) ||
    (employee && typeof employee.created_at_date === 'string' ? assertDateOnlyString(employee.created_at_date, 'joiningDate') : null) ||
    toDateOnlyFromTimestamp(employee?.created_at) ||
    null;

  if (joining && ad < joining) {
    throw badRequest('Attendance date must be within employment period');
  }
}

export function assertSelfMarkingAllowed({ actorId, employeeId, source, selfMarkEnabled }) {
  const src = String(source || '').toUpperCase();
  if (src !== 'SELF') return;
  if (!selfMarkEnabled) {
    throw forbidden('Self marking is disabled');
  }
  if (String(actorId) !== String(employeeId)) {
    throw forbidden('Cannot self mark for another employee');
  }
}

export function monthEndForAttendanceDate(attendanceDateIso) {
  return monthEndIso(attendanceDateIso);
}
