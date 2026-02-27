import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict } from '../../../../shared/kernel/errors.js';

import { readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';
import { clientDto } from '../dto/client.dto.js';

import { getClientByCode, insertClient } from '../../infrastructure/persistence/client.repository.pg.js';

export async function createClientUsecase(pool, { body, actorId, requestId }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);
  if (!cfg.clientsEnabled) throw badRequest('Clients are disabled');

  const code = String(body?.code || '').trim();
  const name = String(body?.name || '').trim();
  if (!code) throw badRequest('code is required');
  if (!name) throw badRequest('name is required');

  const email = body?.email ? String(body.email).trim() : null;
  const phone = body?.phone ? String(body.phone).trim() : null;

  return withTransaction(pool, async (client) => {
    const existing = await getClientByCode(client, { code });
    if (existing) throw conflict('Client code already exists');

    const inserted = await insertClient(client, {
      id: crypto.randomUUID(),
      code,
      name,
      email,
      phone,
      created_by: actorId,
      version: 1
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'CLIENT',
      entityId: inserted.id,
      action: 'CLIENT_CREATE',
      beforeData: null,
      afterData: { id: inserted.id, code: inserted.code, name: inserted.name, is_active: inserted.is_active },
      actorId,
      actorRole: null,
      reason: null
    });

    return clientDto(inserted);
  });
}
