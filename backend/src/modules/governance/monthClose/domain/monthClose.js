export function toMonthCloseDto(row) {
  if (!row || !row.id) {
    return { status: 'OPEN' };
  }

  return {
    id: row.id,
    month: row.month,
    scope: row.scope,
    status: row.status,
    reason: row.closed_reason,
    closedBy: row.closed_by ? {
      id: row.closed_by,
      name: null // Frontend can fetch user details separately if needed
    } : null,
    closedAt: row.closed_at
  };
}
