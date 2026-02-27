import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest, conflict, notFound } from '../../../../shared/kernel/errors.js';

import { INCOME_STATUS } from '../../domain/valueObjects/incomeStatus.vo.js';
import {
  assertAmount,
  assertIncomeDate,
  assertIncomeEnabled,
  assertInvoiceIfRequired,
  assertMonthOpenForIncomeDate,
  readIncomeConfig
} from '../../domain/services/incomePolicy.service.js';

import { incomeDto } from '../dto/income.dto.js';

import { getIncomeCategoryById } from '../../infrastructure/persistence/incomeCategory.repository.pg.js';
import { getClientById } from '../../infrastructure/persistence/client.repository.pg.js';
import { getIncomeById, updateIncomeDraft } from '../../infrastructure/persistence/income.repository.pg.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDateOnly(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export async function updateIncomeUsecase(pool, { id, body, actorId, requestId }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const expectedVersion = Number(body.version);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw badRequest('version is required');

  return withTransaction(pool, async (client) => {
    const current = await getIncomeById(client, { id, forUpdate: true });
    if (!current) throw notFound('Income not found');
    if (String(current.status).toUpperCase() !== INCOME_STATUS.DRAFT) throw badRequest('Only DRAFT income can be updated');

    const patch = {};

    if (body.amount !== undefined) patch.amount = assertAmount(body.amount);
    if (body.incomeDate !== undefined) {
      patch.income_date = assertIncomeDate(cfg, { incomeDate: body.incomeDate, todayDate: todayIso() });
    }

    if (body.categoryId !== undefined) {
      const cat = await getIncomeCategoryById(client, { id: body.categoryId });
      if (!cat || !cat.is_active) throw badRequest('Invalid category');
      patch.category_id = body.categoryId;
    }

    if (body.clientId !== undefined) {
      const next = body.clientId ? String(body.clientId) : null;
      if (next) {
        if (!cfg.clientsEnabled) throw badRequest('Clients are disabled');
        const cli = await getClientById(client, { id: next });
        if (!cli || !cli.is_active) throw badRequest('Invalid client');
      }
      patch.client_id = next;
    }

    if (body.invoiceNumber !== undefined) {
      patch.invoice_number = body.invoiceNumber ? String(body.invoiceNumber).trim() : null;
      assertInvoiceIfRequired(cfg, { invoiceNumber: patch.invoice_number });
    } else {
      assertInvoiceIfRequired(cfg, { invoiceNumber: current.invoice_number });
    }

    if (body.title !== undefined) patch.title = String(body.title || '').trim();
    if (body.description !== undefined) patch.description = String(body.description || '').trim();
    if (body.currency !== undefined) patch.currency = String(body.currency || '').trim();
    if (body.divisionId !== undefined) patch.division_id = body.divisionId;

    const incomeDate = patch.income_date ?? current.income_date;

    await assertMonthOpenForIncomeDate(client, {
      incomeDate: toIsoDateOnly(incomeDate),
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const updated = await updateIncomeDraft(client, {
      id,
      patch,
      actorId,
      expectedVersion
    });

    if (!updated) throw conflict('Income was updated by another user');

    await writeAuditLog(client, {
      requestId,
      entityType: 'INCOME',
      entityId: updated.id,
      action: 'INCOME_UPDATE',
      beforeData: { status: current.status, amount: current.amount, version: current.version },
      afterData: { status: updated.status, amount: updated.amount, version: updated.version },
      actorId,
      actorRole: null,
      reason: null
    });

    return incomeDto(updated);
  });
}
