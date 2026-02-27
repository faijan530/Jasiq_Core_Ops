import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';

import { readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';
import { clientDto } from '../dto/client.dto.js';

import { getClientById, updateClient } from '../../infrastructure/persistence/client.repository.pg.js';

export async function updateClientUsecase(pool, { id, patch, actorId, requestId }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);
  if (!cfg.clientsEnabled) throw badRequest('Clients are disabled');

  const version = Number(patch?.version);
  if (!Number.isInteger(version) || version < 1) throw badRequest('version is required');

  return withTransaction(pool, async (client) => {
    const current = await getClientById(client, { id });
    if (!current) throw notFound('Client not found');

    const updated = await updateClient(client, {
      id,
      patch: {
        code: patch.code ? String(patch.code).trim() : null,
        name: patch.name ? String(patch.name).trim() : null,
        email: patch.email !== undefined ? String(patch.email || '').trim() : null,
        phone: patch.phone !== undefined ? String(patch.phone || '').trim() : null,
        is_active: patch.isActive !== undefined ? Boolean(patch.isActive) : null
      },
      actorId,
      expectedVersion: version
    });

    if (!updated) throw conflict('Client was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'CLIENT',
      entityId: updated.id,
      action: 'CLIENT_UPDATE',
      beforeData: { code: current.code, name: current.name, is_active: current.is_active, version: current.version },
      afterData: { code: updated.code, name: updated.name, is_active: updated.is_active, version: updated.version },
      actorId,
      actorRole: null,
      reason: null
    });

    return clientDto(updated);
  });
}
