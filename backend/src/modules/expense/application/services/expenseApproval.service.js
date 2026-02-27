import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';

import { EXPENSE_STATUS } from '../../domain/entities/expense.entity.js';
import { assertMonthOpenForExpenseDate, assertTransition, readExpenseConfig, assertExpenseEnabled } from '../../domain/services/expensePolicy.service.js';

import { getExpenseById, updateExpenseState } from '../../infrastructure/repositories/expense.repository.js';

function toIsoDateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export async function submitExpenseService(pool, { id, actorId, requestId, overrideReason }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  return withTransaction(pool, async (client) => {
    const current = await getExpenseById(client, { id, forUpdate: true });
    if (!current) throw notFound('Expense not found');

    assertTransition({ fromStatus: current.status, toStatus: EXPENSE_STATUS.SUBMITTED });

    await assertMonthOpenForExpenseDate(client, {
      expenseDate: toIsoDateOnly(current.expense_date),
      actorId,
      overrideReason
    });

    const updated = await updateExpenseState(client, {
      id,
      status: EXPENSE_STATUS.SUBMITTED,
      fields: { submitted_at: new Date(), submitted_by: actorId },
      actorId,
      expectedVersion: current.version
    });

    if (!updated) throw conflict('Expense was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'EXPENSE',
      entityId: id,
      action: 'EXPENSE_SUBMIT',
      beforeData: { status: current.status },
      afterData: { status: updated.status },
      actorId,
      actorRole: null,
      reason: null
    });

    return updated;
  });
}

export async function approveExpenseService(pool, { id, actorId, requestId, overrideReason }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  return withTransaction(pool, async (client) => {
    const current = await getExpenseById(client, { id, forUpdate: true });
    if (!current) throw notFound('Expense not found');

    assertTransition({ fromStatus: current.status, toStatus: EXPENSE_STATUS.APPROVED });

    await assertMonthOpenForExpenseDate(client, {
      expenseDate: toIsoDateOnly(current.expense_date),
      actorId,
      overrideReason
    });

    const updated = await updateExpenseState(client, {
      id,
      status: EXPENSE_STATUS.APPROVED,
      fields: { approved_at: new Date(), approved_by: actorId, decision_reason: null },
      actorId,
      expectedVersion: current.version
    });

    if (!updated) throw conflict('Expense was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'EXPENSE',
      entityId: id,
      action: 'EXPENSE_APPROVE',
      beforeData: { status: current.status },
      afterData: { status: updated.status },
      actorId,
      actorRole: null,
      reason: null
    });

    return updated;
  });
}

export async function rejectExpenseService(pool, { id, actorId, requestId, reason, overrideReason }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const trimmed = String(reason || '').trim();
  if (!trimmed) throw badRequest('Reason is required');

  return withTransaction(pool, async (client) => {
    const current = await getExpenseById(client, { id, forUpdate: true });
    if (!current) throw notFound('Expense not found');

    assertTransition({ fromStatus: current.status, toStatus: EXPENSE_STATUS.REJECTED });

    await assertMonthOpenForExpenseDate(client, {
      expenseDate: toIsoDateOnly(current.expense_date),
      actorId,
      overrideReason
    });

    const updated = await updateExpenseState(client, {
      id,
      status: EXPENSE_STATUS.REJECTED,
      fields: { rejected_at: new Date(), rejected_by: actorId, decision_reason: trimmed },
      actorId,
      expectedVersion: current.version
    });

    if (!updated) throw conflict('Expense was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'EXPENSE',
      entityId: id,
      action: 'EXPENSE_REJECT',
      beforeData: { status: current.status },
      afterData: { status: updated.status, decision_reason: trimmed },
      actorId,
      actorRole: null,
      reason: trimmed
    });

    return updated;
  });
}
