export function toOpsInboxItemDto(row) {
  return {
    itemType: row.itemType,
    entityId: row.entityId,
    divisionId: row.divisionId,
    title: row.title,
    createdAt: row.createdAt,
    slaDueAt: row.slaDueAt,
    status: row.status,
    actions: row.actions
  };
}
