export function clientDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    isActive: Boolean(row.is_active),
    version: row.version
  };
}
