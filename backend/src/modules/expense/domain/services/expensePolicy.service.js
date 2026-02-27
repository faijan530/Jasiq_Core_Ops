import { badRequest, forbidden } from '../../../../shared/kernel/errors.js';
import { getSystemConfigValue, isMonthCloseEnabled } from '../../../../shared/kernel/systemConfig.js';

import { ensureMonthOpen } from '../../../governance/monthClose/guards/monthCloseGuard.js';

import { EXPENSE_STATUS } from '../entities/expense.entity.js';

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

export async function readExpenseConfig(pool) {
  const enabled = parseBool(await getSystemConfigValue(pool, 'EXPENSE_ENABLED'));
  const allowBackdated = parseBool(await getSystemConfigValue(pool, 'EXPENSE_ALLOW_BACKDATED'));
  const backdateLimitDays = parseIntSafe(await getSystemConfigValue(pool, 'EXPENSE_BACKDATE_LIMIT_DAYS'), 0);
  const divisionScoped = parseBool(await getSystemConfigValue(pool, 'EXPENSE_DIVISION_SCOPED'));

  return {
    enabled,
    allowBackdated,
    backdateLimitDays,
    divisionScoped
  };
}

export function assertExpenseEnabled(cfg) {
  if (!cfg?.enabled) throw forbidden('Expense module is disabled');
}

export function assertAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) throw badRequest('Invalid amount');
  return n;
}

export function assertExpenseDate(cfg, { expenseDate, todayDate }) {
  const d = assertIsoDateOnly(expenseDate);
  const today = assertIsoDateOnly(todayDate);

  if (d > today) throw badRequest('Expense date cannot be in the future');

  if (!cfg.allowBackdated) {
    if (d < today) throw badRequest('Backdated expenses are not allowed');
    return d;
  }

  const limit = Number(cfg.backdateLimitDays || 0);
  if (limit <= 0) return d;

  const exp = new Date(`${d}T00:00:00.000Z`);
  const t = new Date(`${today}T00:00:00.000Z`);
  const diffDays = Math.floor((t.getTime() - exp.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays > limit) throw badRequest('Backdated expense exceeds limit');

  return d;
}

export function assertReimbursementFields({ isReimbursement, employeeId }) {
  const reimb = Boolean(isReimbursement);
  if (reimb && !employeeId) throw badRequest('employeeId is required for reimbursements');
}

export function assertDivisionIfScoped(cfg, { divisionId }) {
  if (!cfg.divisionScoped) return;
  if (!divisionId) throw badRequest('divisionId is required');
}

export function assertExpenseStatus(status) {
  const s = String(status || '').toUpperCase();
  const values = Object.values(EXPENSE_STATUS);
  if (!values.includes(s)) throw badRequest('Invalid expense status');
  return s;
}

const allowed = {
  [EXPENSE_STATUS.DRAFT]: [EXPENSE_STATUS.SUBMITTED],
  [EXPENSE_STATUS.SUBMITTED]: [EXPENSE_STATUS.APPROVED, EXPENSE_STATUS.REJECTED],
  [EXPENSE_STATUS.APPROVED]: [EXPENSE_STATUS.PAID],
  [EXPENSE_STATUS.PAID]: [EXPENSE_STATUS.CLOSED],
  [EXPENSE_STATUS.REJECTED]: [],
  [EXPENSE_STATUS.CLOSED]: []
};

export function assertTransition({ fromStatus, toStatus }) {
  const from = assertExpenseStatus(fromStatus);
  const to = assertExpenseStatus(toStatus);
  const ok = (allowed[from] || []).includes(to);
  if (!ok) throw badRequest(`Invalid expense transition: ${from} → ${to}`);
  return { from, to };
}

export async function assertMonthOpenForExpenseDate(client, { expenseDate, actorId, overrideReason }) {
  const enabled = await isMonthCloseEnabled(client);
  if (!enabled) return;

  await ensureMonthOpen(expenseDate, client);
}
