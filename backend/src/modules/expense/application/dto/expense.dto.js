export function expenseDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    expenseDate: row.expense_date,
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    title: row.title,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    divisionId: row.division_id,
    projectId: row.project_id,
    paidByMethod: row.paid_by_method,
    vendorName: row.vendor_name,
    isReimbursement: row.is_reimbursement,
    employeeId: row.employee_id,
    employeeName: row.employee_name || null,
    status: row.status,
    submittedAt: row.submitted_at,
    submittedBy: row.submitted_by,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    rejectedAt: row.rejected_at,
    rejectedBy: row.rejected_by,
    decisionReason: row.decision_reason,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    version: row.version
  };
}
