import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';
import { getSystemConfigValue } from '../../../../shared/kernel/systemConfig.js';

import { expenseCategoryDto } from '../dto/expenseCategory.dto.js';
import {
  getExpenseCategoryByCode,
  getExpenseCategoryById,
  insertExpenseCategory,
  listActiveExpenseCategories,
  updateExpenseCategory
} from '../../infrastructure/repositories/expenseCategory.repository.js';

async function assertExpenseEnabled(pool) {
  const raw = await getSystemConfigValue(pool, 'EXPENSE_ENABLED');
  const v = String(raw ?? '').trim().toLowerCase();
  const enabled = v === 'true' || v === '1' || v === 'yes' || v === 'enabled' || v === 'on';
  if (!enabled) throw badRequest('Expense module is disabled');
}

export async function createCategoryService(pool, { code, name, description, actorId, requestId }) {
  await assertExpenseEnabled(pool);

  const c = String(code || '').trim();
  const n = String(name || '').trim();
  if (!c) throw badRequest('code is required');
  if (!n) throw badRequest('name is required');

  return withTransaction(pool, async (client) => {
    const existing = await getExpenseCategoryByCode(client, { code: c });
    if (existing) throw conflict('Category code already exists');

    const inserted = await insertExpenseCategory(client, {
      id: crypto.randomUUID(),
      code: c,
      name: n,
      description: description ? String(description).trim() : null,
      created_by: actorId,
      version: 1
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'EXPENSE_CATEGORY',
      entityId: inserted.id,
      action: 'EXPENSE_CATEGORY_CREATE',
      beforeData: null,
      afterData: { id: inserted.id, code: inserted.code, name: inserted.name, is_active: inserted.is_active },
      actorId,
      actorRole: null,
      reason: null
    });

    return expenseCategoryDto(inserted);
  });
}

export async function updateCategoryService(pool, { id, patch, actorId, requestId }) {
  await assertExpenseEnabled(pool);

  const version = Number(patch?.version);
  if (!Number.isInteger(version) || version < 1) throw badRequest('version is required');

  return withTransaction(pool, async (client) => {
    const current = await getExpenseCategoryById(client, { id });
    if (!current) throw notFound('Category not found');

    const updated = await updateExpenseCategory(client, {
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
      entityType: 'EXPENSE_CATEGORY',
      entityId: updated.id,
      action: 'EXPENSE_CATEGORY_UPDATE',
      beforeData: { code: current.code, name: current.name, is_active: current.is_active, version: current.version },
      afterData: { code: updated.code, name: updated.name, is_active: updated.is_active, version: updated.version },
      actorId,
      actorRole: null,
      reason: null
    });

    return expenseCategoryDto(updated);
  });
}

export async function listActiveCategoriesService(pool) {
  await assertExpenseEnabled(pool);
  const rows = await listActiveExpenseCategories(pool);
  return rows.map(expenseCategoryDto);
}
