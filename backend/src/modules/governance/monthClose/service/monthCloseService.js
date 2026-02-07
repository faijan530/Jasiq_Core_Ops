import crypto from 'node:crypto';

import { badRequest, conflict } from '../../../../shared/kernel/errors.js';
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
  const m = normalizeMonthEnd(month);
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

      // EXISTING RECORD HANDLING (single-row update)
      if (latest.status === status) {
        // Idempotent: no change, no audit.
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
