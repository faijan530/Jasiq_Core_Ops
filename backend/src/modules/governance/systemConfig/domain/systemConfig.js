export function toSystemConfigDto(row) {
  return {
    key: row.key,
    value: row.value,
    description: row.description
  };
}
