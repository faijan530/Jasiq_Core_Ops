export function toRoleDto(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description
  };
}

export function toPermissionDto(row) {
  return {
    id: row.id,
    code: row.code,
    description: row.description
  };
}
