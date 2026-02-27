export function incomeDecisionDto({ beforeStatus, afterStatus, reason }) {
  return {
    beforeStatus: beforeStatus || null,
    afterStatus: afterStatus || null,
    reason: reason || null
  };
}
