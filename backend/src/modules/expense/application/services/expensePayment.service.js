import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';

import { EXPENSE_STATUS } from '../../domain/entities/expense.entity.js';
import { assertMonthOpenForExpenseDate, assertTransition, readExpenseConfig, assertExpenseEnabled } from '../../domain/services/expensePolicy.service.js';

import { getExpenseById, updateExpenseState } from '../../infrastructure/repositories/expense.repository.js';
import { insertExpensePayment, listExpensePayments, sumExpensePayments } from '../../infrastructure/repositories/expensePayment.repository.js';
import { expensePaymentDto } from '../dto/expensePayment.dto.js';

function toNum(n) {
  const x = typeof n === 'string' ? Number(n) : Number(n ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function toIsoDateOnly(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dt = new Date(v);
  if (Number.isFinite(dt.getTime())) return dt.toISOString().slice(0, 10);
  return s.slice(0, 10);
}

export async function calculateRemainingAmountService(client, { expenseId }) {
  const exp = await getExpenseById(client, { id: expenseId, forUpdate: false });
  if (!exp) throw notFound('Expense not found');

  const paid = toNum(await sumExpensePayments(client, { expenseId }));
  const amt = toNum(exp.amount);
  return { totalPaid: paid, remainingAmount: Math.max(0, amt - paid) };
}

export async function markExpensePaidService(pool, { id, payment, actorId, requestId, overrideReason }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const paidAmount = Number(payment?.paidAmount);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) throw badRequest('Invalid paidAmount');

  return withTransaction(pool, async (client) => {
    const exp = await getExpenseById(client, { id, forUpdate: true });
    if (!exp) throw notFound('Expense not found');

    if (![EXPENSE_STATUS.APPROVED, EXPENSE_STATUS.PAID].includes(String(exp.status).toUpperCase())) {
      throw badRequest('Expense must be APPROVED or PAID');
    }

    await assertMonthOpenForExpenseDate(client, {
      expenseDate: toIsoDateOnly(exp.expense_date),
      actorId,
      overrideReason
    });

    const inserted = await insertExpensePayment(client, {
      id: crypto.randomUUID(),
      expense_id: exp.id,
      paid_amount: paidAmount,
      paid_at: payment.paidAt,
      method: String(payment.method || '').toUpperCase(),
      reference_id: payment.referenceId || null,
      created_by: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'EXPENSE_PAYMENT',
      entityId: inserted.id,
      action: 'EXPENSE_MARK_PAID',
      beforeData: null,
      afterData: {
        expenseId: inserted.expense_id,
        paidAmount: inserted.paid_amount,
        paidAt: inserted.paid_at,
        method: inserted.method,
        referenceId: inserted.reference_id
      },
      actorId,
      actorRole: null,
      reason: null
    });

    const { totalPaid, remainingAmount } = await calculateRemainingAmountService(client, { expenseId: exp.id });

    if (String(exp.status).toUpperCase() === EXPENSE_STATUS.APPROVED) {
      if (remainingAmount <= 0.00001) {
        const before = { status: exp.status };
        const updated = await updateExpenseState(client, {
          id: exp.id,
          status: EXPENSE_STATUS.PAID,
          fields: {},
          actorId,
          expectedVersion: exp.version
        });

        if (!updated) throw conflict('Expense was updated by another user');

        await writeAuditLog(client, {
          requestId,
          entityType: 'EXPENSE',
          entityId: exp.id,
          action: 'EXPENSE_STATUS_CHANGE',
          beforeData: before,
          afterData: { status: updated.status },
          actorId,
          actorRole: null,
          reason: null
        });

        return { expense: updated, payment: expensePaymentDto(inserted), totalPaid, remainingAmount: 0 };
      }
    }

    return { expense: exp, payment: expensePaymentDto(inserted), totalPaid, remainingAmount };
  });
}

export async function listExpensePaymentsService(pool, { id }) {
  const cfg = await readExpenseConfig(pool);
  assertExpenseEnabled(cfg);

  const exp = await getExpenseById(pool, { id, forUpdate: false });
  if (!exp) throw notFound('Expense not found');

  const rows = await listExpensePayments(pool, { expenseId: id });
  return rows.map(expensePaymentDto);
}
