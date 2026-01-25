export function toProjectDto(row) {
  return {
    id: row.id,
    divisionId: row.division_id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    version: row.version
  };
}
