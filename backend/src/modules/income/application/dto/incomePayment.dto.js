export function incomePaymentDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    incomeId: row.income_id,
    paidAmount: row.paid_amount,
    paidAt: row.paid_at,
    method: row.method,
    referenceId: row.reference_id,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}
