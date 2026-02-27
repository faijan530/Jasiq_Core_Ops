import crypto from 'node:crypto';

import { badRequest, conflict, forbidden, monthClosed } from '../../../../shared/kernel/errors.js';
import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';

import {
  countMonthCloses,
  countAdjustments,
  countSnapshots,
  getMonthClose,
  getLatestMonthClose,
  getSnapshot,
  insertMonthClose,
  insertSnapshot,
  insertAdjustment,
  listMonthCloses,
  listSnapshots,
  listAdjustments,
  updateMonthCloseStatus,
  getMonthCloseWithUser
} from '../repository/monthCloseRepository.js';

import { toMonthCloseDto } from '../domain/monthClose.js';

function normalizeMonthStart(value) {
  const raw = String(value ?? '').trim();
  if (!raw) throw badRequest('Invalid month');

  const iso = /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw badRequest('Invalid month');
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return start.toISOString().slice(0, 10);
}

export async function listMonthClosesPaged(pool, { offset, limit }) {
  const rows = await listMonthCloses(pool, { offset, limit });
  const total = await countMonthCloses(pool);
  return { rows, total };
}

export async function getMonthCloseStatus(pool, { month, scope }) {
  const m = normalizeMonthStart(month);
  const existing = await getMonthCloseWithUser(pool, { month: m, scope });
  
  // Get summary data dynamically
  const summary = await getMonthCloseSummary(pool, { month: m });
  
  if (existing) {
    return {
      ...toMonthCloseDto(existing),
      summary
    };
  }
  
  // If no record exists for month, return OPEN status with summary
  return { 
    status: 'OPEN',
    month: m,
    summary
  };
}

async function sumIncome(client, { from, to }) {
  const res = await client.query(
    `SELECT COALESCE(SUM(i.amount),0) AS total
     FROM income i
     WHERE i.income_date BETWEEN $1::date AND $2::date
       AND i.status IN ('APPROVED','PARTIALLY_PAID','PAID','CLOSED')`,
    [from, to]
  );
  return Number(res.rows[0]?.total || 0);
}

async function sumExpense(client, { from, to }) {
  const res = await client.query(
    `SELECT COALESCE(SUM(e.amount),0) AS total
     FROM expense e
     WHERE e.expense_date BETWEEN $1::date AND $2::date
       AND e.status IN ('APPROVED','PAID','CLOSED')`,
    [from, to]
  );
  return Number(res.rows[0]?.total || 0);
}

async function sumPayroll(client, { month }) {
  const res = await client.query(
    `SELECT COALESCE(SUM(
        CASE
          WHEN pi.item_type = 'DEDUCTION' THEN -pi.amount
          ELSE pi.amount
        END
      ), 0) AS total
     FROM payroll_run pr
     LEFT JOIN payroll_item pi ON pi.payroll_run_id = pr.id
     WHERE pr.month::date = $1::date
       AND pr.status IN ('LOCKED','PAID','CLOSED')`,
    [month]
  );
  return Number(res.rows[0]?.total || 0);
}

async function countPendingIncomeApprovals(client, { from, to }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM income i
     WHERE i.income_date BETWEEN $1::date AND $2::date
       AND i.status = 'SUBMITTED'`,
    [from, to]
  );
  return Number(res.rows[0]?.c || 0);
}

async function countPendingExpenseApprovals(client, { from, to }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM expense e
     WHERE e.expense_date BETWEEN $1::date AND $2::date
       AND e.status = 'SUBMITTED'`,
    [from, to]
  );
  return Number(res.rows[0]?.c || 0);
}

async function isPayrollLocked(client, { month }) {
  const res = await client.query(
    `SELECT status
     FROM payroll_run
     WHERE month::date = $1::date
     LIMIT 1`,
    [month]
  );
  if (!res.rows || res.rows.length === 0) return true;
  const status = String(res.rows[0]?.status || '').toUpperCase();
  if (!status) return false;
  return ['LOCKED', 'PAID', 'CLOSED'].includes(status);
}

function monthRange({ month }) {
  const start = normalizeMonthStart(month);
  const d = new Date(`${start}T00:00:00.000Z`);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { start, end: end.toISOString().slice(0, 10) };
}

export async function previewMonth(pool, { month, actorId, requestId }) {
  const m = normalizeMonthStart(month);
  const { start, end } = monthRange({ month: m });

  const [total_income, total_expense, pending_income_approvals, pending_expense_approvals, payrollLocked] = await Promise.all([
    sumIncome(pool, { from: start, to: end }),
    sumExpense(pool, { from: start, to: end }),
    countPendingIncomeApprovals(pool, { from: start, to: end }),
    countPendingExpenseApprovals(pool, { from: start, to: end }),
    isPayrollLocked(pool, { month: m })
  ]);

  const total_payroll = await sumPayroll(pool, { month: m });
  const net_profit_loss = Number(total_income) - (Number(total_expense) + Number(total_payroll));

  const blockingIssues = [];
  if (pending_income_approvals > 0) blockingIssues.push('PENDING_INCOME_APPROVALS');
  if (pending_expense_approvals > 0) blockingIssues.push('PENDING_EXPENSE_APPROVALS');
  if (!payrollLocked) blockingIssues.push('PAYROLL_NOT_LOCKED');

  const readyToClose = blockingIssues.length === 0;

  if (requestId && actorId) {
    await writeAuditLog(pool, {
      requestId,
      entityType: 'MONTH_CLOSE',
      entityId: null,
      action: 'MONTH_CLOSE_PREVIEWED',
      beforeData: null,
      afterData: { month: m, totals: { total_income, total_expense, total_payroll, net_profit_loss }, blockingIssues, readyToClose },
      actorId,
      actorRole: null,
      reason: null
    });
  }

  return {
    month: m,
    total_income,
    total_expense,
    total_payroll,
    net_profit_loss,
    pending_income_approvals,
    pending_expense_approvals,
    payroll_not_locked: !payrollLocked,
    readyToClose,
    blockingIssues
  };
}

async function divisionBreakdown(client, { start, end }) {
  const [inc, exp] = await Promise.all([
    client.query(
      `SELECT division_id, COALESCE(SUM(amount),0) AS total
       FROM income
       WHERE income_date BETWEEN $1::date AND $2::date
         AND status IN ('APPROVED','PARTIALLY_PAID','PAID','CLOSED')
       GROUP BY division_id`,
      [start, end]
    ),
    client.query(
      `SELECT division_id, COALESCE(SUM(amount),0) AS total
       FROM expense
       WHERE expense_date BETWEEN $1::date AND $2::date
         AND status IN ('APPROVED','PAID','CLOSED')
       GROUP BY division_id`,
      [start, end]
    )
  ]);

  const map = {};
  for (const r of inc.rows || []) {
    const k = r.division_id ? String(r.division_id) : 'null';
    map[k] = { ...(map[k] || {}), income: Number(r.total || 0) };
  }
  for (const r of exp.rows || []) {
    const k = r.division_id ? String(r.division_id) : 'null';
    map[k] = { ...(map[k] || {}), expense: Number(r.total || 0) };
  }

  return map;
}

async function payrollDivisionBreakdown(client, { month }) {
  const res = await client.query(
    `SELECT
       pi.division_id,
       COALESCE(SUM(
         CASE
           WHEN pi.item_type = 'DEDUCTION' THEN -pi.amount
           ELSE pi.amount
         END
       ), 0) AS total
     FROM payroll_run pr
     LEFT JOIN payroll_item pi ON pi.payroll_run_id = pr.id
     WHERE pr.month::date = $1::date
       AND pr.status IN ('LOCKED','PAID','CLOSED')
     GROUP BY pi.division_id`,
    [month]
  );

  const map = {};
  for (const r of res.rows || []) {
    const k = r.division_id ? String(r.division_id) : 'null';
    map[k] = Number(r.total || 0);
  }
  return map;
}

export async function generateSnapshot(client, { month, actorId, requestId }) {
  const m = normalizeMonthStart(month);
  const { start, end } = monthRange({ month: m });

  const [total_income, total_expense] = await Promise.all([
    sumIncome(client, { from: start, to: end }),
    sumExpense(client, { from: start, to: end })
  ]);
  const total_payroll = await sumPayroll(client, { month: m });
  const net_profit_loss = Number(total_income) - (Number(total_expense) + Number(total_payroll));

  const [division_breakdown, payroll_breakdown] = await Promise.all([
    divisionBreakdown(client, { start, end }),
    payrollDivisionBreakdown(client, { month: m })
  ]);

  const inserted = await insertSnapshot(client, {
    id: crypto.randomUUID(),
    month: m,
    scope: 'COMPANY',
    snapshot_version: 1,
    total_income,
    total_expense,
    total_payroll,
    net_profit_loss,
    division_breakdown: JSON.stringify(division_breakdown),
    category_breakdown: null,
    payroll_breakdown: JSON.stringify(payroll_breakdown),
    created_at: new Date(),
    created_by: actorId
  });

  await writeAuditLog(client, {
    requestId,
    entityType: 'MONTH_SNAPSHOT',
    entityId: inserted?.id || null,
    action: 'SNAPSHOT_GENERATED',
    beforeData: null,
    afterData: { month: m, totals: { total_income, total_expense, total_payroll, net_profit_loss } },
    actorId,
    actorRole: null,
    reason: null
  });

  return inserted;
}

export async function closeMonth(pool, { month, reason, actorId, requestId }) {
  const m = normalizeMonthStart(month);
  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) throw badRequest('Reason is required');

  return withTransaction(pool, async (client) => {
    const latest = await getLatestMonthClose(client, { month: m, scope: 'COMPANY' });
    if (latest && String(latest.status).toUpperCase() === 'CLOSED') {
      return { item: toMonthCloseDto(latest), snapshot: await getSnapshot(client, { month: m, scope: 'COMPANY', snapshotVersion: 1 }) };
    }

    const preview = await previewMonth(client, { month: m, actorId: null, requestId: null });
    if (!preview.readyToClose) {
      throw conflict('Month is not ready to close', { blockingIssues: preview.blockingIssues });
    }

    const snapExisting = await getSnapshot(client, { month: m, scope: 'COMPANY', snapshotVersion: 1 });
    const snapshot = snapExisting || (await generateSnapshot(client, { month: m, actorId, requestId }));

    if (!latest) {
      const inserted = await insertMonthClose(client, {
        id: crypto.randomUUID(),
        month: m,
        scope: 'COMPANY',
        status: 'CLOSED',
        closed_at: new Date(),
        closed_by: actorId,
        closed_reason: trimmedReason,
        opened_at: null,
        opened_by: null
      });

      await writeAuditLog(client, {
        requestId,
        entityType: 'MONTH_CLOSE',
        entityId: inserted.id,
        action: 'MONTH_CLOSED',
        beforeData: { month: m, status: 'OPEN' },
        afterData: { month: m, status: 'CLOSED', totals: { total_income: snapshot.total_income, total_expense: snapshot.total_expense, total_payroll: snapshot.total_payroll, net_profit_loss: snapshot.net_profit_loss } },
        actorId,
        actorRole: null,
        reason: trimmedReason
      });

      return { item: toMonthCloseDto(inserted), snapshot };
    }

    const updated = await updateMonthCloseStatus(client, { id: latest.id, status: 'CLOSED', actorId, reason: trimmedReason });

    await writeAuditLog(client, {
      requestId,
      entityType: 'MONTH_CLOSE',
      entityId: updated.id,
      action: 'MONTH_CLOSED',
      beforeData: { month: latest.month, status: latest.status },
      afterData: { month: updated.month, status: updated.status, totals: { total_income: snapshot.total_income, total_expense: snapshot.total_expense, total_payroll: snapshot.total_payroll, net_profit_loss: snapshot.net_profit_loss } },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return { item: toMonthCloseDto(updated), snapshot };
  });
}

async function getMonthCloseSummary(pool, { month }) {
  // Get total employees - use status field from actual schema
  const employeesRes = await pool.query(
    `SELECT COUNT(*) as total FROM employee WHERE status = 'ACTIVE'`
  );
  const totalEmployees = parseInt(employeesRes.rows[0].total) || 0;
  
  // Get pending leave requests for the month
  const leaveRes = await pool.query(
    `SELECT COUNT(*) as pending FROM leave_request 
     WHERE status = 'PENDING' 
     AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM $1::date)
     AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM $1::date)`,
    [month]
  );
  const pendingLeaveRequests = parseInt(leaveRes.rows[0].pending) || 0;
  
  // Get attendance records for the month (no attendance_correction table exists)
  const attendanceRes = await pool.query(
    `SELECT COUNT(*) as total FROM attendance_record 
     WHERE EXTRACT(YEAR FROM attendance_date) = EXTRACT(YEAR FROM $1::date)
     AND EXTRACT(MONTH FROM attendance_date) = EXTRACT(MONTH FROM $1::date)`,
    [month]
  );
  const attendanceRecords = parseInt(attendanceRes.rows[0].total) || 0;
  
  return {
    totalEmployees,
    pendingLeaveRequests,
    pendingAttendanceCorrections: 0 // Set to 0 since table doesn't exist
  };
}

export async function getOrCreateMonthClose(pool, { month, scope }) {
  const m = normalizeMonthStart(month);
  const existing = await getMonthClose(pool, { month: m, scope });
  if (existing) return existing;

  // Implicit OPEN: do not create a row.
  return {
    id: null,
    month: m,
    scope,
    status: 'OPEN',
    closed_at: null,
    closed_by: null,
    closed_reason: null,
    opened_at: null,
    opened_by: null
  };
}

export async function setMonthCloseStatus(pool, { month, scope, status, actorId, requestId, reason }) {
  const m = normalizeMonthStart(month);
  const trimmedReason = String(reason || '').trim();

  if (!trimmedReason) {
    throw badRequest('Reason is required');
  }

  try {
    return await withTransaction(pool, async (client) => {
      const latest = await getLatestMonthClose(client, { month: m, scope });

      // IMPLICIT OPEN: no row exists.
      if (!latest) {
        if (status === 'OPEN') {
          // Idempotent OPEN: no change, no audit.
          throw conflict('Month already open.');
        }

        // OPEN -> CLOSE inserts a single row.
        const inserted = await insertMonthClose(client, {
          id: crypto.randomUUID(),
          month: m,
          scope,
          status: 'CLOSED',
          closed_at: new Date(),
          closed_by: actorId,
          closed_reason: trimmedReason,
          opened_at: null,
          opened_by: null
        });

        await writeAuditLog(client, {
          requestId,
          entityType: 'MONTH_CLOSE',
          entityId: inserted.id,
          action: 'CLOSE',
          beforeData: { month: m, scope, status: 'OPEN' },
          afterData: { month: inserted.month, scope: inserted.scope, status: inserted.status },
          actorId,
          actorRole: null,
          reason: trimmedReason
        });

        return inserted;
      }

      // Feature 11: irreversible close in v1
      if (String(status).toUpperCase() === 'OPEN') {
        throw forbidden('Reopen is not allowed');
      }

      // EXISTING RECORD HANDLING (single-row update)
      if (latest.status === status) {
        throw conflict(`Month already ${status === 'OPEN' ? 'open' : 'closed'}.`);
      }

      const updated = await updateMonthCloseStatus(client, {
        id: latest.id,
        status,
        actorId,
        reason: trimmedReason
      });

      await writeAuditLog(client, {
        requestId,
        entityType: 'MONTH_CLOSE',
        entityId: updated.id,
        action: status === 'CLOSED' ? 'CLOSE' : 'OPEN',
        beforeData: { month: latest.month, scope: latest.scope, status: latest.status },
        afterData: { month: updated.month, scope: updated.scope, status: updated.status },
        actorId,
        actorRole: null,
        reason: trimmedReason
      });

      return updated;
    });
  } catch (err) {
    // Log unexpected errors and re-throw with context
    console.error('MonthCloseService error:', err);
    throw err;
  }
}

export async function createAdjustmentService(pool, { payload, actorId, requestId }) {
  const adjustmentDate = String(payload?.adjustmentDate || '').slice(0, 10);
  const targetMonth = normalizeMonthStart(payload?.targetMonth);
  const targetType = String(payload?.targetType || '').trim().toUpperCase();
  const direction = String(payload?.direction || '').trim().toUpperCase();
  const amount = Number(payload?.amount);
  const reason = String(payload?.reason || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(adjustmentDate)) throw badRequest('Invalid adjustmentDate');
  if (!reason) throw badRequest('Reason is required');
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest('Invalid amount');
  if (!['INCREASE', 'DECREASE'].includes(direction)) throw badRequest('Invalid direction');
  if (!['EXPENSE', 'INCOME', 'PAYROLL', 'SETTLEMENT', 'REIMBURSEMENT'].includes(targetType)) throw badRequest('Invalid targetType');

  const adjustmentMonth = normalizeMonthStart(adjustmentDate);

  return withTransaction(pool, async (client) => {
    // adjustment month must be OPEN
    const adjStatus = await getLatestMonthClose(client, { month: adjustmentMonth, scope: 'COMPANY' });
    if (adjStatus && String(adjStatus.status).toUpperCase() === 'CLOSED') throw monthClosed();

    // target month must be CLOSED
    const tgtStatus = await getLatestMonthClose(client, { month: targetMonth, scope: 'COMPANY' });
    if (!tgtStatus || String(tgtStatus.status).toUpperCase() !== 'CLOSED') throw badRequest('Target month is not closed');

    const inserted = await insertAdjustment(client, {
      id: crypto.randomUUID(),
      adjustment_date: adjustmentDate,
      adjustment_month: adjustmentMonth,
      target_month: targetMonth,
      target_type: targetType,
      target_id: payload?.targetId || null,
      scope: payload?.divisionId ? 'DIVISION' : 'COMPANY',
      division_id: payload?.divisionId || null,
      direction,
      amount,
      reason,
      created_at: new Date(),
      created_by: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'ADJUSTMENT',
      entityId: inserted.id,
      action: 'ADJUSTMENT_CREATED',
      beforeData: null,
      afterData: { month: targetMonth, adjustmentMonth, targetType, direction, amount, reason },
      actorId,
      actorRole: null,
      reason
    });

    return { item: inserted };
  });
}

export async function listAdjustmentsService(pool, { query, offset, limit, page, pageSize }) {
  const targetMonth = query?.targetMonth ? normalizeMonthStart(query.targetMonth) : null;
  const divisionId = query?.divisionId ? String(query.divisionId) : null;
  const targetType = query?.type ? String(query.type).toUpperCase() : null;

  const [items, total] = await Promise.all([
    listAdjustments(pool, { targetMonth, divisionId, targetType, offset, limit }),
    countAdjustments(pool, { targetMonth, divisionId, targetType })
  ]);

  return { items, total, page, pageSize };
}

export async function listSnapshotsService(pool, { query, offset, limit, page, pageSize }) {
  const month = query?.month ? normalizeMonthStart(query.month) : null;
  const scope = query?.scope ? String(query.scope).toUpperCase() : null;

  const [items, total] = await Promise.all([
    listSnapshots(pool, { month, scope, offset, limit }),
    countSnapshots(pool, { month, scope })
  ]);

  return { items, total, page, pageSize };
}
