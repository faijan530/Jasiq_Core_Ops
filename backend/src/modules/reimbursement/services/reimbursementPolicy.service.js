import { badRequest, forbidden } from '../../../shared/kernel/errors.js';
import { getSystemConfigValue, isMonthCloseEnabled } from '../../../shared/kernel/systemConfig.js';

import { ensureMonthOpen } from '../../governance/monthClose/guards/monthCloseGuard.js';

import { REIMBURSEMENT_STATUS } from './reimbursementStatus.vo.js';

function parseBool(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'enabled';
}

function parseIntSafe(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseNumSafe(v, fallback) {
  const n = Number(v);
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

export function monthStartIso(dateIso) {
  const d = new Date(`${assertIsoDateOnly(dateIso)}T00:00:00.000Z`);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return start.toISOString().slice(0, 10);
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

export async function readReimbursementConfig(pool) {
  const enabled = parseBool(await getSystemConfigValue(pool, 'REIMBURSEMENT_ENABLED'));
  const receiptRequired = parseBool(await getSystemConfigValue(pool, 'REIMBURSEMENT_RECEIPT_REQUIRED'));
  const maxAmount = parseNumSafe(await getSystemConfigValue(pool, 'REIMBURSEMENT_MAX_AMOUNT_PER_CLAIM'), 0);
  const approvalLevels = parseIntSafe(await getSystemConfigValue(pool, 'REIMBURSEMENT_APPROVAL_LEVELS'), 1);
  const allowBackdated = parseBool(await getSystemConfigValue(pool, 'REIMBURSEMENT_ALLOW_BACKDATED'));
  const backdateLimitDays = parseIntSafe(await getSystemConfigValue(pool, 'REIMBURSEMENT_BACKDATE_LIMIT_DAYS'), 0);
  const partialPaymentsEnabled = parseBool(await getSystemConfigValue(pool, 'REIMBURSEMENT_PARTIAL_PAYMENTS_ENABLED'));
  const autoExpenseOn = parseBool(await getSystemConfigValue(pool, 'REIMBURSEMENT_AUTO_EXPENSE_ON'));

  return {
    enabled,
    receiptRequired,
    maxAmount,
    approvalLevels,
    allowBackdated,
    backdateLimitDays,
    partialPaymentsEnabled,
    autoExpenseOn
  };
}

export function assertReimbursementEnabled(cfg) {
  if (!cfg?.enabled) throw forbidden('Reimbursement module is disabled');
}

export function assertAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) throw badRequest('Invalid amount');
  return n;
}

export function assertReimbursementStatus(status) {
  const s = String(status || '').toUpperCase();
  const values = Object.values(REIMBURSEMENT_STATUS);
  if (!values.includes(s)) throw badRequest('Invalid reimbursement status');
  return s;
}

const allowed = {
  [REIMBURSEMENT_STATUS.DRAFT]: [REIMBURSEMENT_STATUS.SUBMITTED],
  [REIMBURSEMENT_STATUS.SUBMITTED]: [REIMBURSEMENT_STATUS.APPROVED, REIMBURSEMENT_STATUS.REJECTED],
  [REIMBURSEMENT_STATUS.APPROVED]: [REIMBURSEMENT_STATUS.PAID],
  [REIMBURSEMENT_STATUS.PAID]: [REIMBURSEMENT_STATUS.CLOSED],
  [REIMBURSEMENT_STATUS.REJECTED]: [],
  [REIMBURSEMENT_STATUS.CLOSED]: []
};

export function assertTransition({ fromStatus, toStatus }) {
  const from = assertReimbursementStatus(fromStatus);
  const to = assertReimbursementStatus(toStatus);
  const ok = (allowed[from] || []).includes(to);
  if (!ok) throw badRequest(`Invalid reimbursement transition: ${from} → ${to}`);
  return { from, to };
}

export function assertClaimDate(cfg, { claimDate, todayDate }) {
  const d = assertIsoDateOnly(claimDate);
  const today = assertIsoDateOnly(todayDate);
  if (d > today) throw badRequest('Claim date cannot be in the future');

  if (!cfg.allowBackdated) {
    if (d < today) throw badRequest('Backdated claims are not allowed');
    return d;
  }

  const limit = Number(cfg.backdateLimitDays || 0);
  if (limit <= 0) return d;

  const c = new Date(`${d}T00:00:00.000Z`);
  const t = new Date(`${today}T00:00:00.000Z`);
  const diffDays = Math.floor((t.getTime() - c.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays > limit) throw badRequest('Backdated claim exceeds limit');

  return d;
}

export function assertMaxAmount(cfg, { totalAmount }) {
  const max = Number(cfg.maxAmount || 0);
  if (!Number.isFinite(max) || max <= 0) return;
  if (Number(totalAmount) > max) throw badRequest('Claim amount exceeds maximum');
}

export async function assertMonthOpenForClaimDate(client, { claimDate, actorId, overrideReason }) {
  const enabled = await isMonthCloseEnabled(client);
  if (!enabled) return;

  await ensureMonthOpen(claimDate, client);
}
