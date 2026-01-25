import { countAuditLogs, listAuditLogs } from '../repository/auditRepository.js';

export async function listAuditLogsPaged(pool, { filters, offset, limit }) {
  const rows = await listAuditLogs(pool, { filters, offset, limit });
  const total = await countAuditLogs(pool, filters);
  return { rows, total };
}
