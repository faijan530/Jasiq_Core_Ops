export function pendingApprovalLevel({ approvalLevels, requestRow }) {
  if (approvalLevels === 1) return 1;
  return requestRow?.approved_l1_at ? 2 : 1;
}
