import { badRequest } from '../../../../shared/kernel/errors.js';
import { pagedResponse } from '../../../../shared/kernel/pagination.js';

import { readIncomeConfig, assertIncomeEnabled } from '../../domain/services/incomePolicy.service.js';
import { listClients } from '../../infrastructure/persistence/client.repository.pg.js';
import { clientDto } from '../dto/client.dto.js';

export async function listClientsUsecase(pool, { query }) {
  const cfg = await readIncomeConfig(pool);
  assertIncomeEnabled(cfg);
  if (!cfg.clientsEnabled) throw badRequest('Clients are disabled');

  const page = Number(query.page || 1);
  const pageSize = Number(query.size || query.pageSize || 50);
  if (!Number.isInteger(page) || page < 1) throw badRequest('Invalid page');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) throw badRequest('Invalid size');

  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  const res = await listClients(pool, {
    active: query.active !== undefined ? Boolean(query.active) : null,
    search: query.search ? String(query.search).trim() : null,
    offset,
    limit
  });

  return pagedResponse({ items: res.items.map(clientDto), total: res.total, page, pageSize });
}
