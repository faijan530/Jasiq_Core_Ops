import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';

import { readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';
import { incomeCategoryDto } from '../dto/incomeCategory.dto.js';

import { getIncomeCategoryById, updateIncomeCategory } from '../../infrastructure/persistence/incomeCategory.repository.pg.js';

export async function updateIncomeCategoryUsecase(pool, { id, patch, actorId, requestId }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const version = Number(patch?.version);
  if (!Number.isInteger(version) || version < 1) throw badRequest('version is required');

  return withTransaction(pool, async (client) => {
    const current = await getIncomeCategoryById(client, { id });
    if (!current) throw notFound('Category not found');

    const updated = await updateIncomeCategory(client, {
      id,
      patch: {
        code: patch.code ? String(patch.code).trim() : null,
        name: patch.name ? String(patch.name).trim() : null,
        description: patch.description !== undefined ? String(patch.description || '').trim() : null,
        is_active: patch.isActive !== undefined ? Boolean(patch.isActive) : null
      },
      actorId,
      expectedVersion: version
    });

    if (!updated) throw conflict('Category was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'INCOME_CATEGORY',
      entityId: updated.id,
      action: 'INCOME_CATEGORY_UPDATE',
      beforeData: { code: current.code, name: current.name, is_active: current.is_active, version: current.version },
      afterData: { code: updated.code, name: updated.name, is_active: updated.is_active, version: updated.version },
      actorId,
      actorRole: null,
      reason: null
    });

    return incomeCategoryDto(updated);
  });
}
