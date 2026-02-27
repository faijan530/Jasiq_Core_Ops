import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict } from '../../../../shared/kernel/errors.js';

import { readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';
import { incomeCategoryDto } from '../dto/incomeCategory.dto.js';

import { getIncomeCategoryByCode, insertIncomeCategory } from '../../infrastructure/persistence/incomeCategory.repository.pg.js';

export async function createIncomeCategoryUsecase(pool, { code, name, description, actorId, requestId }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const c = String(code || '').trim();
  const n = String(name || '').trim();
  if (!c) throw badRequest('code is required');
  if (!n) throw badRequest('name is required');

  return withTransaction(pool, async (client) => {
    const existing = await getIncomeCategoryByCode(client, { code: c });
    if (existing) throw conflict('Category code already exists');

    const inserted = await insertIncomeCategory(client, {
      id: crypto.randomUUID(),
      code: c,
      name: n,
      description: description ? String(description).trim() : null,
      created_by: actorId,
      version: 1
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'INCOME_CATEGORY',
      entityId: inserted.id,
      action: 'INCOME_CATEGORY_CREATE',
      beforeData: null,
      afterData: { id: inserted.id, code: inserted.code, name: inserted.name, is_active: inserted.is_active },
      actorId,
      actorRole: null,
      reason: null
    });

    return incomeCategoryDto(inserted);
  });
}
