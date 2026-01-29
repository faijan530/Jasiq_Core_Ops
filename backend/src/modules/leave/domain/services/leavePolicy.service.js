import { badRequest, forbidden } from '../../../../shared/kernel/errors.js';
import { getSystemConfigValue, isMonthCloseEnabled } from '../../../../shared/kernel/systemConfig.js';

function parseBool(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'enabled';
}

function parseIntSafe(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function assertIsoDateOnly(dateIso) {
  const s = String(dateIso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw badRequest('Invalid date');
  return s;
}

function monthEndIso(dateIso) {
  const d = new Date(`${assertIsoDateOnly(dateIso)}T00:00:00.000Z`);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return end.toISOString().slice(0, 10);
}

function addMonths(yyyyMmDd, months) {
  const d = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  const moved = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  return moved.toISOString().slice(0, 10);
}

async function hasCompanyPermission(client, { actorId, permissionCode }) {
  const res = await client.query(
    `SELECT 1
     FROM user_role ur
     JOIN role_permission rp ON rp.role_id = ur.role_id
     JOIN permission p ON p.id = rp.permission_id
     WHERE ur.user_id = $1
       AND ur.scope = 'COMPANY'
       AND p.code = $2
     LIMIT 1`,
    [actorId, permissionCode]
  );
  return res.rowCount > 0;
}

export async function readLeaveConfig(pool) {
  const enabled = parseBool(await getSystemConfigValue(pool, 'LEAVE_ENABLED'));
  const approvalLevels = parseIntSafe(await getSystemConfigValue(pool, 'LEAVE_APPROVAL_LEVELS'), 1);
  const allowHalfDay = parseBool(await getSystemConfigValue(pool, 'LEAVE_ALLOW_HALF_DAY'));
  const allowBackdated = parseBool(await getSystemConfigValue(pool, 'LEAVE_ALLOW_BACKDATED_REQUESTS'));
  const backdateLimitDays = parseIntSafe(await getSystemConfigValue(pool, 'LEAVE_BACKDATE_LIMIT_DAYS'), 0);
  const attachmentsEnabled = parseBool(await getSystemConfigValue(pool, 'LEAVE_ATTACHMENTS_ENABLED'));

  return {
    enabled,
    approvalLevels: approvalLevels === 2 ? 2 : 1,
    allowHalfDay,
    allowBackdated,
    backdateLimitDays,
    attachmentsEnabled
  };
}

export function assertLeaveEnabled(cfg) {
  if (!cfg?.enabled) throw forbidden('Leave module is disabled');
}

export function assertDateRange({ startDate, endDate }) {
  const s = assertIsoDateOnly(startDate);
  const e = assertIsoDateOnly(endDate);
  if (s > e) throw badRequest('Invalid date range');
  return { startDate: s, endDate: e };
}

export function assertBackdatedAllowed(cfg, { startDate, todayDate }) {
  if (!cfg.allowBackdated) {
    if (startDate < todayDate) throw badRequest('Backdated leave requests are not allowed');
    return;
  }

  const limit = Number(cfg.backdateLimitDays || 0);
  if (limit <= 0) return;

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const today = new Date(`${todayDate}T00:00:00.000Z`);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays > limit) throw badRequest('Backdated leave request exceeds limit');
}

export function assertHalfDayAllowed(cfg) {
  if (!cfg.allowHalfDay) throw badRequest('Half-day leave is disabled');
}

export async function assertMonthsOpenForRange(client, { startDate, endDate, actorId, overrideReason }) {
  const enabled = await isMonthCloseEnabled(client);
  if (!enabled) return;

  const overrideAllowed = await hasCompanyPermission(client, { actorId, permissionCode: 'LEAVE_MONTH_CLOSE_OVERRIDE' });

  const startMonthEnd = monthEndIso(startDate);
  const endMonthEnd = monthEndIso(endDate);

  let cursor = `${startMonthEnd.slice(0, 7)}-01`;
  while (true) {
    const mEnd = monthEndIso(cursor);
    const res = await client.query(
      `SELECT status
       FROM month_close
       WHERE scope = 'COMPANY' AND month::date = $1::date
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [mEnd]
    );
    const status = res.rows[0]?.status || 'OPEN';
    if (status === 'CLOSED') {
      if (!overrideAllowed) throw forbidden('Month is closed');
      const trimmed = String(overrideReason || '').trim();
      if (!trimmed) throw badRequest('Reason is required');
    }

    if (mEnd === endMonthEnd) break;
    cursor = addMonths(cursor, 1);
  }
}
