import { withTransaction } from '../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../shared/kernel/audit.js';
import { conflict, notFound } from '../../../shared/kernel/errors.js';
import { parsePagination, pagedResponse } from '../../../shared/kernel/pagination.js';

import { listAlerts, countAlerts, getAlertById, updateAlert } from '../repositories/alert.repository.js';
import { readOpsConfig, assertAlertsEnabled } from './opsPolicy.service.js';
import { assertCanAccessDivision } from './divisionScopePolicy.service.js';

export async function listAlertsService(pool, { actorId, query }) {
  const cfg = await readOpsConfig(pool);
  assertAlertsEnabled(cfg);

  const divisionId = query.divisionId || null;
  if (divisionId) await assertCanAccessDivision(pool, { actorId, divisionId });

  const { offset, limit, page, pageSize } = parsePagination(query);

  const rows = await listAlerts(pool, {
    divisionId,
    status: query.status || null,
    alertType: query.alertType || null,
    offset,
    limit
  });

  const total = await countAlerts(pool, {
    divisionId,
    status: query.status || null,
    alertType: query.alertType || null
  });

  return pagedResponse({ items: rows, total, page, pageSize });
}

export async function acknowledgeAlertService(pool, { id, actorId, actorRole, requestId }) {
  const cfg = await readOpsConfig(pool);
  assertAlertsEnabled(cfg);

  return withTransaction(pool, async (client) => {
    const current = await getAlertById(client, { id, forUpdate: true });
    if (!current) throw notFound('Alert not found');

    if (current.status === 'ACKNOWLEDGED' || current.status === 'RESOLVED') {
      return current;
    }

    if (current.status !== 'OPEN') throw conflict('Invalid alert state');

    const updated = await updateAlert(client, {
      id,
      patch: {
        status: 'ACKNOWLEDGED',
        acknowledged_at: new Date(),
        acknowledged_by: actorId
      }
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'OPS_ALERT',
      entityId: id,
      action: 'OPS_ALERT_ACK',
      beforeData: { status: current.status },
      afterData: { status: updated.status },
      actorId,
      actorRole,
      reason: null
    });

    return updated;
  });
}

export async function resolveAlertService(pool, { id, actorId, actorRole, requestId }) {
  const cfg = await readOpsConfig(pool);
  assertAlertsEnabled(cfg);

  return withTransaction(pool, async (client) => {
    const current = await getAlertById(client, { id, forUpdate: true });
    if (!current) throw notFound('Alert not found');

    if (current.status === 'RESOLVED') {
      return current;
    }

    if (current.status !== 'OPEN' && current.status !== 'ACKNOWLEDGED') {
      throw conflict('Invalid alert state');
    }

    const updated = await updateAlert(client, {
      id,
      patch: {
        status: 'RESOLVED',
        resolved_at: new Date(),
        resolved_by: actorId
      }
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'OPS_ALERT',
      entityId: id,
      action: 'OPS_ALERT_RESOLVE',
      beforeData: { status: current.status },
      afterData: { status: updated.status },
      actorId,
      actorRole,
      reason: null
    });

    return updated;
  });
}
