export function toAuditLogDto(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    correlationId: row.correlation_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    severity: row.severity,
    scope: row.scope,
    divisionId: row.division_id,
    beforeData: row.before_data,
    afterData: row.after_data,
    meta: row.meta,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    actorRoles: row.actor_roles,
    actorEmail: row.actor_email,
    reason: row.reason,
    createdAt: row.created_at
  };
}
