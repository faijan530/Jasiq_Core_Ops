import { countAuditLogs, countAuditTimeline, listAuditLogs, listAuditTimeline } from '../repository/auditRepository.js';

export async function listAuditLogsPaged(pool, { filters, offset, limit }) {
  const rows = await listAuditLogs(pool, { filters, offset, limit });
  const total = await countAuditLogs(pool, filters);
  return { rows, total };
}

export async function listAuditTimelinePaged(pool, { entityType, entityId, offset, limit }) {
  const rows = await listAuditTimeline(pool, { entityType, entityId, offset, limit });
  const total = await countAuditTimeline(pool, { entityType, entityId });
  return { rows, total };
}
