import crypto from 'node:crypto';

import { badRequest } from '../../../../shared/kernel/errors.js';
import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';

import {
  countMonthCloses,
  getMonthClose,
  getLatestMonthClose,
  insertMonthClose,
  listMonthCloses,
  updateMonthCloseStatus
} from '../repository/monthCloseRepository.js';

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  err.code = 'CONFLICT';
  return err;
}

function normalizeMonthEnd(isoDate) {
  const d = new Date(isoDate);
  const utcEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return utcEnd.toISOString().slice(0, 10);
}

export async function listMonthClosesPaged(pool, { offset, limit }) {
  const rows = await listMonthCloses(pool, { offset, limit });
  const total = await countMonthCloses(pool);
  return { rows, total };
}

export async function getOrCreateMonthClose(pool, { month, scope }) {
  const m = normalizeMonthEnd(month);
  const existing = await getMonthClose(pool, { month: m, scope });
  if (existing) return existing;

  const created = await insertMonthClose(pool, {
    id: crypto.randomUUID(),
    month: m,
    scope,
    status: 'OPEN'
  });

  return created;
}

export async function setMonthCloseStatus(pool, { month, scope, status, actorId, requestId, reason }) {
  const m = normalizeMonthEnd(month);
  const trimmedReason = String(reason || '').trim();

  if (!trimmedReason) {
    throw badRequest('Reason is required');
  }

  try {
    return await withTransaction(pool, async (client) => {
      const latest = await getLatestMonthClose(client, { month: m, scope });

      // FIRST-TIME (EMPTY TABLE) HANDLING
      if (!latest) {
        const inserted = await insertMonthClose(client, {
          id: crypto.randomUUID(),
          month: m,
          scope,
          status,
          closed_at: status === 'CLOSED' ? new Date() : null,
          closed_by: actorId,
          closed_reason: trimmedReason
        });

        await writeAuditLog(client, {
          requestId,
          entityType: 'MONTH_CLOSE',
          entityId: inserted.id,
          action: status === 'CLOSED' ? 'CLOSE' : 'OPEN',
          beforeData: null,
          afterData: { month: inserted.month, scope: inserted.scope, status: inserted.status },
          actorId,
          actorRole: null,
          reason: trimmedReason
        });

        return inserted;
      }

      // EXISTING RECORD HANDLING
      if (latest.status === status) {
        throw conflict(`Month is already ${status}`);
      }

      // INSERT a new row (append-only)
      const inserted = await insertMonthClose(client, {
        id: crypto.randomUUID(),
        month: m,
        scope,
        status,
        closed_at: status === 'CLOSED' ? new Date() : null,
        closed_by: status === 'CLOSED' ? actorId : null,
        closed_reason: status === 'CLOSED' ? trimmedReason : null
      });

      await writeAuditLog(client, {
        requestId,
        entityType: 'MONTH_CLOSE',
        entityId: inserted.id,
        action: status === 'CLOSED' ? 'CLOSE' : 'OPEN',
        beforeData: { month: latest.month, scope: latest.scope, status: latest.status },
        afterData: { month: inserted.month, scope: inserted.scope, status: inserted.status },
        actorId,
        actorRole: null,
        reason: trimmedReason
      });

      return inserted;
    });
  } catch (err) {
    // Log unexpected errors and re-throw with context
    console.error('MonthCloseService error:', err);
    throw err;
  }
}
