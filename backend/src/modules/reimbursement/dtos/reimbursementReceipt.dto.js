export function reimbursementReceiptDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    reimbursementId: row.reimbursement_id,
    fileName: row.file_name,
    contentType: row.content_type,
    fileSize: Number(row.file_size || 0),
    storageKey: row.storage_key,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
    isActive: Boolean(row.is_active)
  };
}
