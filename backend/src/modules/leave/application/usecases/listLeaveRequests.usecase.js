import { parsePagination, pagedResponse } from '../../../../shared/kernel/pagination.js';

import { readLeaveConfig, assertLeaveEnabled } from '../../domain/services/leavePolicy.service.js';
import { listLeaveRequests, countLeaveRequests } from '../../infrastructure/persistence/leaveRequest.repository.pg.js';

export async function listLeaveRequestsUsecase(pool, { query }) {
  const cfg = await readLeaveConfig(pool);
  assertLeaveEnabled(cfg);

  const { offset, limit, page, pageSize } = parsePagination(query || {});
  const employeeId = query?.employeeId ? String(query.employeeId) : null;
  const status = query?.status ? String(query.status).toUpperCase() : null;
  const divisionId = query?.divisionId ? String(query.divisionId) : null;

  const rows = await listLeaveRequests(pool, { employeeId, status, divisionId, offset, limit });
  const total = await countLeaveRequests(pool, { employeeId, status, divisionId });

  return pagedResponse({ items: rows, total, page, pageSize });
}
