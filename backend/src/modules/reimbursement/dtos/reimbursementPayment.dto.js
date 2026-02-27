export function reimbursementPaymentDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    reimbursementId: row.reimbursement_id,
    paidAmount: Number(row.paid_amount || 0),
    paidAt: row.paid_at,
    method: row.method,
    referenceId: row.reference_id,
    note: row.note,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}
