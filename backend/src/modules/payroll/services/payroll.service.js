import crypto from 'node:crypto';

import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { badRequest, forbidden, notFound } from '../../../shared/kernel/errors.js';
import { getSystemConfigValue, isMonthCloseEnabled } from '../../../shared/kernel/systemConfig.js';

import { ensureMonthOpen } from '../../governance/monthClose/guards/monthCloseGuard.js';

import { PAYROLL_RUN_STATUS } from '../models/payrollRun.model.js';
import { assertTransition, assertEditableStatus } from './payrollPolicy.service.js';
import { computeBasePayItems } from './payrollCalculator.service.js';

import {
  insertPayrollRun,
  getPayrollRunByMonth,
  getPayrollRunById,
  listPayrollRuns,
  updatePayrollRunState
} from '../repositories/payroll.repository.js';
import { listPayrollItemsByRun, insertPayrollItem, listEmployeesWithPayrollItems, sumPayrollItemsByEmployee } from '../repositories/payrollItem.repository.js';
import { insertPayrollPayment, sumPaymentsByEmployee } from '../repositories/payrollPayment.repository.js';

function toDateOnlyIso(value) {
  if (!value) return '';

  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const raw = String(value).trim();
  if (!raw) return '';

  if (raw.includes('T')) {
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return raw.slice(0, 10);
}

async function assertPayrollEnabled(pool) {
  const raw = await getSystemConfigValue(pool, 'PAYROLL_ENABLED');
  const v = String(raw ?? '').trim().toLowerCase();
  const enabled = v === 'true' || v === '1' || v === 'yes' || v === 'enabled' || v === 'on';
  if (!enabled) throw forbidden('Payroll is disabled');
}

function toNum(n) {
  const x = typeof n === 'string' ? Number(n) : Number(n ?? 0);
  return Number.isFinite(x) ? x : 0;
}

async function isRunFullyPaid(client, { payrollRunId }) {
  const { employeeIds } = await listEmployeesWithPayrollItems(client, { payrollRunId, page: 1, pageSize: 100000 });
  if (!employeeIds.length) return false;

  for (const employeeId of employeeIds) {
    const sums = await sumPayrollItemsByEmployee(client, { payrollRunId, employeeId });
    const gross = toNum(sums.gross);
    const deductions = toNum(sums.deductions);
    const adjustments = toNum(sums.adjustments);
    const net = gross + adjustments - deductions;

    const paid = toNum(await sumPaymentsByEmployee(client, { payrollRunId, employeeId }));
    if (paid + 0.00001 < net) return false;
  }

  return true;
}

async function assertMonthNotClosed(client, { month }) {
  const enabled = await isMonthCloseEnabled(client);
  if (!enabled) return;

  await ensureMonthOpen(month, client);
}

export async function listPayrollRunsService(pool, { query }) {
  await assertPayrollEnabled(pool);
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 50);

  const fromMonth = query.fromMonth ? String(query.fromMonth).slice(0, 10) : null;
  const toMonth = query.toMonth ? String(query.toMonth).slice(0, 10) : null;
  const status = query.status ? String(query.status).toUpperCase() : null;

  const res = await listPayrollRuns(pool, { fromMonth, toMonth, status, page, pageSize });
  return {
    items: res.items,
    page,
    pageSize,
    total: res.total
  };
}

export async function createPayrollRunService(pool, { month, notes, actorId, requestId }) {
  await assertPayrollEnabled(pool);
  const m = String(month || '').slice(0, 10);
  if (!m) throw badRequest('month is required');

  return withTransaction(pool, async (client) => {
    await assertMonthNotClosed(client, { month: m });

    const existing = await getPayrollRunByMonth(client, { month: m });
    if (existing) throw badRequest('Payroll run already exists for month');

    const now = new Date();

    const inserted = await insertPayrollRun(client, {
      id: crypto.randomUUID(),
      month: m,
      status: PAYROLL_RUN_STATUS.DRAFT,
      generated_at: now,
      generated_by: actorId,
      reviewed_at: null,
      reviewed_by: null,
      locked_at: null,
      locked_by: null,
      paid_at: null,
      closed_at: null,
      notes: notes || null,
      version: 1
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'PAYROLL_RUN',
      entityId: inserted.id,
      action: 'PAYROLL_RUN_CREATE',
      beforeData: null,
      afterData: { id: inserted.id, month: inserted.month, status: inserted.status },
      actorId,
      actorRole: null,
      reason: null
    });

    return inserted;
  });
}

export async function getPayrollRunByIdService(pool, { id }) {
  await assertPayrollEnabled(pool);
  const row = await getPayrollRunById(pool, { id, forUpdate: false });
  if (!row) throw notFound('Payroll run not found');
  return row;
}

export async function computePayrollDraftService(pool, { id, actorId, requestId }) {
  await assertPayrollEnabled(pool);
  return withTransaction(pool, async (client) => {
    const run = await getPayrollRunById(client, { id, forUpdate: true });
    if (!run) throw notFound('Payroll run not found');
    if (run.status !== PAYROLL_RUN_STATUS.DRAFT) throw badRequest('Payroll run must be DRAFT');

    await assertMonthNotClosed(client, { month: run.month });

    const result = await computeBasePayItems(client, { payrollRunId: run.id, month: run.month, actorId });

    await writeAuditLog(client, {
      requestId,
      entityType: 'PAYROLL_RUN',
      entityId: run.id,
      action: 'PAYROLL_DRAFT_COMPUTE',
      beforeData: { status: run.status },
      afterData: { status: run.status, createdBasePayItems: result.createdCount },
      actorId,
      actorRole: null,
      reason: null
    });

    return await getPayrollRunById(client, { id, forUpdate: false });
  });
}

export async function reviewPayrollRunService(pool, { id, actorId, requestId }) {
  await assertPayrollEnabled(pool);
  return withTransaction(pool, async (client) => {
    const run = await getPayrollRunById(client, { id, forUpdate: true });
    if (!run) throw notFound('Payroll run not found');

    assertTransition({ fromStatus: run.status, toStatus: PAYROLL_RUN_STATUS.REVIEWED });

    const before = { status: run.status };
    const updated = await updatePayrollRunState(client, {
      id: run.id,
      status: PAYROLL_RUN_STATUS.REVIEWED,
      reviewed_at: new Date(),
      reviewed_by: actorId,
      locked_at: run.locked_at,
      locked_by: run.locked_by,
      paid_at: run.paid_at,
      closed_at: run.closed_at,
      notes: run.notes
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'PAYROLL_RUN',
      entityId: run.id,
      action: 'PAYROLL_STATUS_CHANGE',
      beforeData: before,
      afterData: { status: updated.status },
      actorId,
      actorRole: null,
      reason: null
    });

    return updated;
  });
}

export async function lockPayrollRunService(pool, { id, actorId, requestId }) {
  await assertPayrollEnabled(pool);
  return withTransaction(pool, async (client) => {
    const run = await getPayrollRunById(client, { id, forUpdate: true });
    if (!run) throw notFound('Payroll run not found');

    assertTransition({ fromStatus: run.status, toStatus: PAYROLL_RUN_STATUS.LOCKED });

    const before = { status: run.status };
    const updated = await updatePayrollRunState(client, {
      id: run.id,
      status: PAYROLL_RUN_STATUS.LOCKED,
      reviewed_at: run.reviewed_at,
      reviewed_by: run.reviewed_by,
      locked_at: new Date(),
      locked_by: actorId,
      paid_at: run.paid_at,
      closed_at: run.closed_at,
      notes: run.notes
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'PAYROLL_RUN',
      entityId: run.id,
      action: 'PAYROLL_STATUS_CHANGE',
      beforeData: before,
      afterData: { status: updated.status },
      actorId,
      actorRole: null,
      reason: null
    });

    return updated;
  });
}

export async function listPayrollItemsService(pool, { id }) {
  await assertPayrollEnabled(pool);
  const run = await getPayrollRunById(pool, { id, forUpdate: false });
  if (!run) throw notFound('Payroll run not found');
  const rows = await listPayrollItemsByRun(pool, { payrollRunId: id });
  return rows;
}

export async function addPayrollAdjustmentService(pool, { id, employeeId, itemType, description, amount, reason, actorId, requestId }) {
  await assertPayrollEnabled(pool);
  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) throw badRequest('Reason is required');

  const flag = await getSystemConfigValue(pool, 'PAYROLL_ALLOW_MANUAL_ADJUSTMENTS');
  const enabled = String(flag || '').trim().toLowerCase();
  const allow = enabled === 'true' || enabled === '1' || enabled === 'yes' || enabled === 'enabled';
  if (!allow) throw forbidden('Manual adjustments are disabled');

  return withTransaction(pool, async (client) => {
    const run = await getPayrollRunById(client, { id, forUpdate: true });
    if (!run) throw notFound('Payroll run not found');

    await assertMonthNotClosed(client, { month: run.month });

    assertEditableStatus(run.status);

    const inserted = await insertPayrollItem(client, {
      id: crypto.randomUUID(),
      payroll_run_id: run.id,
      employee_id: employeeId,
      item_type: String(itemType).toUpperCase(),
      description: String(description || '').trim(),
      amount: Number(amount),
      division_id: null,
      is_system_generated: false,
      created_by: actorId
    });

    if (!inserted) throw badRequest('Duplicate payroll item');

    await writeAuditLog(client, {
      requestId,
      entityType: 'PAYROLL_ITEM',
      entityId: inserted.id,
      action: 'PAYROLL_ITEM_ADDED',
      beforeData: null,
      afterData: {
        payroll_run_id: inserted.payroll_run_id,
        employee_id: inserted.employee_id,
        item_type: inserted.item_type,
        description: inserted.description,
        amount: inserted.amount
      },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return inserted;
  });
}

export async function markPayrollPaidService(pool, { id, payment, actorId, requestId }) {
  await assertPayrollEnabled(pool);
  return withTransaction(pool, async (client) => {
    const run = await getPayrollRunById(client, { id, forUpdate: true });
    if (!run) throw notFound('Payroll run not found');

    await assertMonthNotClosed(client, { month: run.month });

    if (run.status !== PAYROLL_RUN_STATUS.LOCKED && run.status !== PAYROLL_RUN_STATUS.PAID) throw badRequest('Payroll run must be LOCKED or PAID');

    const inserted = await insertPayrollPayment(client, {
      id: crypto.randomUUID(),
      payroll_run_id: run.id,
      employee_id: payment.employeeId,
      paid_amount: payment.paidAmount,
      paid_at: payment.paidAt,
      method: payment.method,
      reference_id: payment.referenceId,
      created_by: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'PAYROLL_PAYMENT',
      entityId: inserted.id,
      action: 'PAYROLL_PAYMENT_MARKED',
      beforeData: null,
      afterData: {
        payroll_run_id: inserted.payroll_run_id,
        employee_id: inserted.employee_id,
        paid_amount: inserted.paid_amount,
        paid_at: inserted.paid_at,
        method: inserted.method,
        reference_id: inserted.reference_id
      },
      actorId,
      actorRole: null,
      reason: null
    });

    if (run.status === PAYROLL_RUN_STATUS.LOCKED) {
      const fullyPaid = await isRunFullyPaid(client, { payrollRunId: run.id });
      if (fullyPaid) {
        const before = { status: run.status };
        const updated = await updatePayrollRunState(client, {
          id: run.id,
          status: PAYROLL_RUN_STATUS.PAID,
          reviewed_at: run.reviewed_at,
          reviewed_by: run.reviewed_by,
          locked_at: run.locked_at,
          locked_by: run.locked_by,
          paid_at: new Date(),
          closed_at: run.closed_at,
          notes: run.notes
        });

        await writeAuditLog(client, {
          requestId,
          entityType: 'PAYROLL_RUN',
          entityId: run.id,
          action: 'PAYROLL_STATUS_CHANGE',
          beforeData: before,
          afterData: { status: updated.status },
          actorId,
          actorRole: null,
          reason: null
        });

        return updated;
      }
    }

    return await getPayrollRunById(client, { id: run.id, forUpdate: false });
  });
}

export async function closePayrollRunService(pool, { id, actorId, requestId }) {
  await assertPayrollEnabled(pool);
  return withTransaction(pool, async (client) => {
    const run = await getPayrollRunById(client, { id, forUpdate: true });
    if (!run) throw notFound('Payroll run not found');

    await assertMonthNotClosed(client, { month: run.month });

    assertTransition({ fromStatus: run.status, toStatus: PAYROLL_RUN_STATUS.CLOSED });

    const before = { status: run.status };
    const updated = await updatePayrollRunState(client, {
      id: run.id,
      status: PAYROLL_RUN_STATUS.CLOSED,
      reviewed_at: run.reviewed_at,
      reviewed_by: run.reviewed_by,
      locked_at: run.locked_at,
      locked_by: run.locked_by,
      paid_at: run.paid_at,
      closed_at: new Date(),
      notes: run.notes
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'PAYROLL_RUN',
      entityId: run.id,
      action: 'PAYROLL_STATUS_CHANGE',
      beforeData: before,
      afterData: { status: updated.status },
      actorId,
      actorRole: null,
      reason: null
    });

    return updated;
  });
}
