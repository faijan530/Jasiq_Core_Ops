import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';

import { INCOME_STATUS } from '../../domain/valueObjects/incomeStatus.vo.js';
import { assertMonthOpenForIncomeDate, assertTransition, readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';

import { getIncomeById, updateIncomeState } from '../../infrastructure/persistence/income.repository.pg.js';

function toIsoDateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export async function rejectIncomeUsecase(pool, { id, actorId, requestId, reason, overrideReason }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const trimmed = String(reason || '').trim();
  if (!trimmed) throw badRequest('Reason is required');

  return withTransaction(pool, async (client) => {
    const current = await getIncomeById(client, { id, forUpdate: true });
    if (!current) throw notFound('Income not found');

    assertTransition({ fromStatus: current.status, toStatus: INCOME_STATUS.REJECTED });

    await assertMonthOpenForIncomeDate(client, {
      incomeDate: toIsoDateOnly(current.income_date),
      actorId,
      overrideReason
    });

    const updated = await updateIncomeState(client, {
      id,
      status: INCOME_STATUS.REJECTED,
      fields: { rejected_at: new Date(), rejected_by: actorId, decision_reason: trimmed },
      actorId,
      expectedVersion: current.version
    });

    if (!updated) throw conflict('Income was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'INCOME',
      entityId: id,
      action: 'INCOME_REJECT',
      beforeData: { status: current.status },
      afterData: { status: updated.status, decision_reason: trimmed },
      actorId,
      actorRole: null,
      reason: trimmed
    });

    return updated;
  });
}
