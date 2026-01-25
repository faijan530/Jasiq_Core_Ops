export function toAuditLogDto(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    beforeData: row.before_data,
    afterData: row.after_data,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    reason: row.reason,
    createdAt: row.created_at
  };
}
