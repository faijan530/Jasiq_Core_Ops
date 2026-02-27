export function reimbursementDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    claimDate: row.claim_date,
    claimMonth: row.claim_month,
    title: row.title,
    description: row.description,
    totalAmount: Number(row.total_amount || 0),
    scope: row.scope,
    divisionId: row.division_id,
    status: row.status,
    decisionReason: row.decision_reason,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    rejectedAt: row.rejected_at,
    rejectedBy: row.rejected_by,
    paidAmount: Number(row.paid_amount || 0),
    dueAmount: Number(row.due_amount || 0),
    linkedExpenseId: row.linked_expense_id,
    employeeName: row.employee_name || null,
    receiptCount: row.receipt_count !== undefined && row.receipt_count !== null ? Number(row.receipt_count) : null,
    submittedAt: row.submitted_at,
    submittedBy: row.submitted_by,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    version: row.version
  };
}
