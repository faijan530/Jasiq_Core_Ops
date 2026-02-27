export function incomeDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    incomeDate: row.income_date,
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    clientId: row.client_id,
    clientName: row.client_name || null,
    invoiceNumber: row.invoice_number,
    title: row.title,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    divisionId: row.division_id,
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
