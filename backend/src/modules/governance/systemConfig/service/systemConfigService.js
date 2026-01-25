import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { notFound } from '../../../../shared/kernel/errors.js';

import {
  countSystemConfigs,
  getSystemConfig,
  listSystemConfigs,
  upsertSystemConfig
} from '../repository/systemConfigRepository.js';

export async function listSystemConfigsPaged(pool, { offset, limit }) {
  const rows = await listSystemConfigs(pool, { offset, limit });
  const total = await countSystemConfigs(pool);
  return { rows, total };
}

export async function getSystemConfigByKey(pool, key) {
  const row = await getSystemConfig(pool, key);
  if (!row) throw notFound('System config not found');
  return row;
}

export async function setSystemConfigValue(pool, { key, value, description, actorId, requestId, reason }) {
  return withTransaction(pool, async (client) => {
    const before = await getSystemConfig(client, key);

    const nextValue = String(value);
    const nextDescription = description ?? null;

    if (before) {
      const sameValue = String(before.value) === nextValue;
      const sameDescription = String(before.description ?? '') === String(nextDescription ?? '');
      if (sameValue && sameDescription) {
        return before;
      }
    }

    const after = await upsertSystemConfig(client, {
      key,
      value: nextValue,
      description: nextDescription
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'system_config',
      entityId: null,
      action: before ? 'UPSERT' : 'CREATE',
      beforeData: before ? { key: before.key, value: before.value, description: before.description } : null,
      afterData: { key: after.key, value: after.value, description: after.description },
      actorId,
      actorRole: null,
      reason
    });

    return after;
  });
}
