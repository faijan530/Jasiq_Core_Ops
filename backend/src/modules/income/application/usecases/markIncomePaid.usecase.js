import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';

import { INCOME_STATUS } from '../../domain/valueObjects/incomeStatus.vo.js';
import { assertMonthOpenForIncomeDate, assertTransition, readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';

import { getIncomeById, updateIncomeState } from '../../infrastructure/persistence/income.repository.pg.js';
import { insertIncomePayment, listIncomePayments, sumIncomePayments } from '../../infrastructure/persistence/incomePayment.repository.pg.js';

import { incomePaymentDto } from '../dto/incomePayment.dto.js';

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

export async function listIncomePaymentsUsecase(pool, { id }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const inc = await getIncomeById(pool, { id, forUpdate: false });
  if (!inc) throw notFound('Income not found');

  const rows = await listIncomePayments(pool, { incomeId: id });
  return rows.map(incomePaymentDto);
}

export async function markIncomePaidUsecase(pool, { id, payment, actorId, requestId, overrideReason }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const paidAmount = Number(payment?.paidAmount);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) throw badRequest('Invalid paidAmount');

  return withTransaction(pool, async (client) => {
    const inc = await getIncomeById(client, { id, forUpdate: true });
    if (!inc) throw notFound('Income not found');

    const currentStatus = String(inc.status).toUpperCase();
    if (![INCOME_STATUS.APPROVED, INCOME_STATUS.PARTIALLY_PAID, INCOME_STATUS.PAID].includes(currentStatus)) {
      throw badRequest('Income must be APPROVED, PARTIALLY_PAID, or PAID');
    }

    await assertMonthOpenForIncomeDate(client, {
      incomeDate: toIsoDateOnly(inc.income_date),
      actorId,
      overrideReason
    });

    const alreadyPaid = toNum(await sumIncomePayments(client, { incomeId: inc.id }));
    const amount = toNum(inc.amount);

    if (!cfg.partialPaymentsEnabled) {
      if (paidAmount + alreadyPaid < amount - 0.00001) throw badRequest('Partial payments are disabled');
    }

    if (paidAmount + alreadyPaid > amount + 0.00001) throw badRequest('Paid amount exceeds income amount');

    const inserted = await insertIncomePayment(client, {
      id: crypto.randomUUID(),
      income_id: inc.id,
      paid_amount: paidAmount,
      paid_at: payment.paidAt,
      method: String(payment.method || '').toUpperCase(),
      reference_id: payment.referenceId || null,
      created_by: actorId
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'INCOME_PAYMENT',
      entityId: inserted.id,
      action: 'INCOME_MARK_PAID',
      beforeData: null,
      afterData: {
        incomeId: inserted.income_id,
        paidAmount: inserted.paid_amount,
        paidAt: inserted.paid_at,
        method: inserted.method,
        referenceId: inserted.reference_id
      },
      actorId,
      actorRole: null,
      reason: null
    });

    const totalPaid = toNum(await sumIncomePayments(client, { incomeId: inc.id }));
    const remainingAmount = Math.max(0, amount - totalPaid);

    if ([INCOME_STATUS.APPROVED, INCOME_STATUS.PARTIALLY_PAID].includes(currentStatus)) {
      const nextStatus = remainingAmount <= 0.00001 ? INCOME_STATUS.PAID : INCOME_STATUS.PARTIALLY_PAID;
      assertTransition({ fromStatus: inc.status, toStatus: nextStatus });

      const before = { status: inc.status };
      const updated = await updateIncomeState(client, {
        id: inc.id,
        status: nextStatus,
        fields: {},
        actorId,
        expectedVersion: inc.version
      });

      if (!updated) throw conflict('Income was updated by another user');

      await writeAuditLog(client, {
        requestId,
        entityType: 'INCOME',
        entityId: inc.id,
        action: 'INCOME_STATUS_CHANGE',
        beforeData: before,
        afterData: { status: updated.status },
        actorId,
        actorRole: null,
        reason: null
      });

      return { income: updated, payment: incomePaymentDto(inserted), totalPaid, remainingAmount };
    }

    return { income: inc, payment: incomePaymentDto(inserted), totalPaid, remainingAmount };
  });
}
