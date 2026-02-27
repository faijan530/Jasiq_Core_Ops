export function expenseDecisionDto({ expenseId, fromStatus, toStatus, reason }) {
  return {
    expenseId,
    fromStatus,
    toStatus,
    reason: reason || null
  };
}
