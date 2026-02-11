export function toDivisionDto(row) {
  const blockedReasons = row?.blockedReasons || [];
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    description: row.description,
    isActive: row.is_active,
    canDeactivate: blockedReasons.length === 0,
    blockedReasons,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    version: row.version
  };
}
