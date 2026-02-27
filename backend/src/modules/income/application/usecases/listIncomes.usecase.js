import { badRequest } from '../../../../shared/kernel/errors.js';
import { pagedResponse } from '../../../../shared/kernel/pagination.js';

import { readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';

import { incomeDto } from '../dto/income.dto.js';

import { listIncomes } from '../../infrastructure/persistence/income.repository.pg.js';

export async function listIncomesUsecase(pool, { query }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);

  const page = Number(query.page || 1);
  const pageSize = Number(query.size || query.pageSize || 20);
  if (!Number.isInteger(page) || page < 1) throw badRequest('Invalid page');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) throw badRequest('Invalid size');

  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  const status = query.status ? String(query.status).toUpperCase() : null;

  const res = await listIncomes(pool, {
    status,
    divisionId: query.divisionId ? String(query.divisionId) : null,
    categoryId: query.categoryId ? String(query.categoryId) : null,
    clientId: query.clientId ? String(query.clientId) : null,
    from: query.from ? String(query.from).slice(0, 10) : null,
    to: query.to ? String(query.to).slice(0, 10) : null,
    search: query.search ? String(query.search).trim() : null,
    offset,
    limit
  });

  return pagedResponse({ items: res.items.map(incomeDto), total: res.total, page, pageSize });
}
