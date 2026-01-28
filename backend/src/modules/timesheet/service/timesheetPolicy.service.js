import { badRequest, forbidden } from '../../../shared/kernel/errors.js';
import { getSystemConfigValue, isMonthCloseEnabled } from '../../../shared/kernel/systemConfig.js';

function parseBool(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'enabled';
}

function parseIntStrict(v, key) {
  const n = Number(v);
  if (!Number.isInteger(n)) throw badRequest(`Invalid ${key}`);
  return n;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseDateOnly(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) throw badRequest('Invalid date');
  const [y, m, d] = String(iso).split('-').map((x) => Number(x));
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

function monthEndIso(iso) {
  const { y, m } = parseDateOnly(iso);
  const last = daysInMonth(y, m);
  return `${y}-${pad2(m)}-${pad2(last)}`;
}

export async function readTimesheetConfig(pool) {
  const enabled = parseBool(await getSystemConfigValue(pool, 'TIMESHEET_ENABLED'));
  const requiredForCompany = parseBool(await getSystemConfigValue(pool, 'TIMESHEET_REQUIRED_FOR_COMPANY'));
  const cycle = String(await getSystemConfigValue(pool, 'TIMESHEET_CYCLE') || 'WEEKLY').toUpperCase();
  const maxHoursPerDay = Number(await getSystemConfigValue(pool, 'TIMESHEET_MAX_HOURS_PER_DAY') || 8);
  const projectTaggingEnabled = parseBool(await getSystemConfigValue(pool, 'TIMESHEET_PROJECT_TAGGING_ENABLED'));
  const approvalLevels = parseIntStrict(await getSystemConfigValue(pool, 'TIMESHEET_APPROVAL_LEVELS') || '1', 'TIMESHEET_APPROVAL_LEVELS');

  if (cycle !== 'WEEKLY' && cycle !== 'MONTHLY') throw badRequest('Invalid TIMESHEET_CYCLE');
  if (!Number.isFinite(maxHoursPerDay) || maxHoursPerDay <= 0) throw badRequest('Invalid TIMESHEET_MAX_HOURS_PER_DAY');
  if (approvalLevels !== 1 && approvalLevels !== 2) throw badRequest('Invalid TIMESHEET_APPROVAL_LEVELS');

  return { enabled, requiredForCompany, cycle, maxHoursPerDay, projectTaggingEnabled, approvalLevels };
}

export function assertTimesheetEnabled(cfg) {
  if (!cfg?.enabled) throw forbidden('Timesheet module is disabled');
}

export function assertEmployeeEligible({ employee, cfg }) {
  if (!employee) throw badRequest('Employee not found');
  if (employee.status !== 'ACTIVE') throw badRequest('Only ACTIVE employees are eligible');

  if (cfg.requiredForCompany && employee.scope !== 'COMPANY') {
    throw forbidden('Timesheets are not required for this employee scope');
  }
}

export function assertNotFuture(workDate, todayDate) {
  if (workDate > todayDate) throw badRequest('Future dates are not allowed');
}

export async function assertMonthOpenForDate(pool, { dateIso }) {
  const enabled = await isMonthCloseEnabled(pool);
  if (!enabled) return;

  const monthEnd = monthEndIso(dateIso);
  const res = await pool.query(
    `SELECT status
     FROM month_close
     WHERE scope = 'COMPANY' AND month::date = $1::date
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [monthEnd]
  );

  const status = res.rows[0]?.status || 'OPEN';
  if (status === 'CLOSED') throw forbidden('Month is closed');
}
