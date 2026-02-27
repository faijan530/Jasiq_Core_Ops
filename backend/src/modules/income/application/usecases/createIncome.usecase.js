import crypto from 'node:crypto';

import { withTransaction } from '../../../../shared/persistence/transaction.js';
import { writeAuditLog } from '../../../../shared/kernel/audit.js';
import { badRequest } from '../../../../shared/kernel/errors.js';

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
import { insertIncome } from '../../infrastructure/persistence/income.repository.pg.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function createIncomeUsecase(pool, { body, actorId, requestId }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const amount = assertAmount(body.amount);
  const incomeDate = assertIncomeDate(cfg, { incomeDate: body.incomeDate, todayDate: todayIso() });

  const invoiceNumber = body.invoiceNumber ? String(body.invoiceNumber).trim() : null;
  assertInvoiceIfRequired(cfg, { invoiceNumber });

  const title = String(body.title || '').trim();
  if (!title) throw badRequest('title is required');

  const divisionId = body.divisionId ? String(body.divisionId) : null;
  if (!divisionId) throw badRequest('divisionId is required');

  return withTransaction(pool, async (client) => {
    await assertMonthOpenForIncomeDate(client, {
      incomeDate,
      actorId,
      overrideReason: body.monthCloseOverrideReason
    });

    const cat = await getIncomeCategoryById(client, { id: body.categoryId });
    if (!cat || !cat.is_active) throw badRequest('Invalid category');

    let clientId = body.clientId ? String(body.clientId) : null;
    if (clientId) {
      if (!cfg.clientsEnabled) throw badRequest('Clients are disabled');
      const cli = await getClientById(client, { id: clientId });
      if (!cli || !cli.is_active) throw badRequest('Invalid client');
    }

    const inserted = await insertIncome(client, {
      id: crypto.randomUUID(),
      income_date: incomeDate,
      category_id: body.categoryId,
      client_id: clientId,
      invoice_number: invoiceNumber,
      title,
      description: body.description ? String(body.description).trim() : null,
      amount,
      currency: body.currency ? String(body.currency).trim() : 'INR',
      division_id: divisionId,
      status: INCOME_STATUS.DRAFT,
      submitted_at: null,
      submitted_by: null,
      approved_at: null,
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
      decision_reason: null,
      created_by: actorId,
      version: 1
    });

    await writeAuditLog(client, {
      requestId,
      entityType: 'INCOME',
      entityId: inserted.id,
      action: 'INCOME_CREATE',
      beforeData: null,
      afterData: {
        incomeId: inserted.id,
        divisionId: inserted.division_id,
        categoryId: inserted.category_id,
        status: inserted.status,
        amount: inserted.amount
      },
      actorId,
      actorRole: null,
      reason: null
    });

    return incomeDto(inserted);
  });
}
