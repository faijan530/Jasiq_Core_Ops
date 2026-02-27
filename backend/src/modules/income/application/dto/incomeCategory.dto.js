export function incomeCategoryDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: Boolean(row.is_active),
    version: row.version
  };
}
