import crypto from 'node:crypto';

import { badRequest } from '../../../shared/kernel/errors.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { withTransaction } from '../../../shared/persistence/transaction.js';

import { assertMonthCloseStatus } from '../domain/monthClose.policy.js';
import { getLatestMonthClose, insertMonthClose } from '../repository/monthClose.repository.js';

function normalizeMonthEnd(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) throw badRequest('Invalid month');
  const utcEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return utcEnd.toISOString().slice(0, 10);
}

export async function listMonthCloses(pool, { offset, limit }) {
  const res = await pool.query(
    `SELECT *
     FROM month_close
     ORDER BY created_at DESC, id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return res.rows;
}

export async function countMonthCloses(pool) {
  const res = await pool.query(
    `SELECT COUNT(*) as total
     FROM month_close`
  );
  return parseInt(res.rows[0].total, 10);
}

export async function listMonthClosesPaged(pool, { offset, limit }) {
  const rows = await listMonthCloses(pool, { offset, limit });
  const total = await countMonthCloses(pool);
  return { rows, total };
}

export async function setMonthCloseStatus(pool, { month, status, actorId, requestId, reason }) {
  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) throw badRequest('Reason is required');

  const s = assertMonthCloseStatus(status);
  const monthEndIso = normalizeMonthEnd(month);

  return withTransaction(pool, async (client) => {
    const latest = await getLatestMonthClose(client, { month: monthEndIso, scope: 'COMPANY' });

    if (latest && latest.status === s) {
      return latest;
    }

    const inserted = await insertMonthClose(client, {
      id: crypto.randomUUID(),
      month: monthEndIso,
      scope: 'COMPANY',
      status: s,
      closed_at: s === 'CLOSED' ? new Date() : null,
      closed_by: s === 'CLOSED' ? actorId : null,
      closed_reason: s === 'CLOSED' ? trimmedReason : null,
      opened_at: s === 'OPEN' ? new Date() : null,
      opened_by: s === 'OPEN' ? actorId : null
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'MONTH_CLOSE',
      entityId: inserted.id,
      action: s === 'CLOSED' ? 'CLOSE' : 'OPEN',
      beforeData: latest
        ? { month: latest.month, old_status: latest.status }
        : null,
      afterData: { month: inserted.month, new_status: inserted.status },
      actorId,
      actorRole: null,
      reason: trimmedReason
    });

    return inserted;
  });
}
