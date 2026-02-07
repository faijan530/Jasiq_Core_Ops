export function toMonthCloseDto(row) {
  return {
    id: row.id,
    month: row.month,
    scope: row.scope,
    status: row.status,
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    closedReason: row.closed_reason,
    openedAt: row.opened_at,
    openedBy: row.opened_by
  };
}
