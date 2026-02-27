import { badRequest, forbidden } from '../../../../shared/kernel/errors.js';
import { getSystemConfigValue, isMonthCloseEnabled } from '../../../../shared/kernel/systemConfig.js';

import { ensureMonthOpen } from '../../../governance/monthClose/guards/monthCloseGuard.js';

import { INCOME_STATUS } from '../valueObjects/incomeStatus.vo.js';

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

export async function readIncomeConfig(pool) {
  const enabled = parseBool(await getSystemConfigValue(pool, 'INCOME_ENABLED'));
  const approvalLevels = parseIntSafe(await getSystemConfigValue(pool, 'INCOME_APPROVAL_LEVELS'), 1);
  const invoiceRequired = parseBool(await getSystemConfigValue(pool, 'INCOME_INVOICE_REQUIRED'));
  const allowBackdated = parseBool(await getSystemConfigValue(pool, 'INCOME_ALLOW_BACKDATED'));
  const backdateLimitDays = parseIntSafe(await getSystemConfigValue(pool, 'INCOME_BACKDATE_LIMIT_DAYS'), 0);
  const clientsEnabled = parseBool(await getSystemConfigValue(pool, 'INCOME_CLIENTS_ENABLED'));
  const invoiceSeriesEnabled = parseBool(await getSystemConfigValue(pool, 'INCOME_INVOICE_SERIES_ENABLED'));
  const partialPaymentsEnabled = parseBool(await getSystemConfigValue(pool, 'INCOME_PARTIAL_PAYMENTS_ENABLED'));

  return {
    enabled,
    approvalLevels,
    invoiceRequired,
    allowBackdated,
    backdateLimitDays,
    clientsEnabled,
    invoiceSeriesEnabled,
    partialPaymentsEnabled
  };
}

export function assertIncomeEnabled(cfg) {
  if (!cfg?.enabled) throw forbidden('Income module is disabled');
}

export function assertAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) throw badRequest('Invalid amount');
  return n;
}

export function assertIncomeDate(cfg, { incomeDate, todayDate }) {
  const d = assertIsoDateOnly(incomeDate);
  const today = assertIsoDateOnly(todayDate);
  if (d > today) throw badRequest('Income date cannot be in the future');

  if (!cfg.allowBackdated) {
    if (d < today) throw badRequest('Backdated income is not allowed');
    return d;
  }

  const limit = Number(cfg.backdateLimitDays || 0);
  if (limit <= 0) return d;

  const inc = new Date(`${d}T00:00:00.000Z`);
  const t = new Date(`${today}T00:00:00.000Z`);
  const diffDays = Math.floor((t.getTime() - inc.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays > limit) throw badRequest('Backdated income exceeds limit');

  return d;
}

export function assertInvoiceIfRequired(cfg, { invoiceNumber }) {
  if (!cfg?.invoiceRequired) return;
  const trimmed = String(invoiceNumber || '').trim();
  if (!trimmed) throw badRequest('invoiceNumber is required');
}

export function assertIncomeStatus(status) {
  const s = String(status || '').toUpperCase();
  const values = Object.values(INCOME_STATUS);
  if (!values.includes(s)) throw badRequest('Invalid income status');
  return s;
}

const allowed = {
  [INCOME_STATUS.DRAFT]: [INCOME_STATUS.SUBMITTED],
  [INCOME_STATUS.SUBMITTED]: [INCOME_STATUS.APPROVED, INCOME_STATUS.REJECTED],
  [INCOME_STATUS.APPROVED]: [INCOME_STATUS.PARTIALLY_PAID, INCOME_STATUS.PAID],
  [INCOME_STATUS.PARTIALLY_PAID]: [INCOME_STATUS.PAID],
  [INCOME_STATUS.PAID]: [INCOME_STATUS.CLOSED],
  [INCOME_STATUS.REJECTED]: [],
  [INCOME_STATUS.CLOSED]: []
};

export function assertTransition({ fromStatus, toStatus }) {
  const from = assertIncomeStatus(fromStatus);
  const to = assertIncomeStatus(toStatus);
  const ok = (allowed[from] || []).includes(to);
  if (!ok) throw badRequest(`Invalid income transition: ${from} → ${to}`);
  return { from, to };
}

export async function assertMonthOpenForIncomeDate(client, { incomeDate, actorId, overrideReason }) {
  const enabled = await isMonthCloseEnabled(client);
  if (!enabled) return;

  await ensureMonthOpen(incomeDate, client);
}
