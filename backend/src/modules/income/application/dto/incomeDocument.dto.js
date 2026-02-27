export function incomeDocumentDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    incomeId: row.income_id,
    fileName: row.file_name,
    contentType: row.content_type,
    fileSize: row.file_size,
    storageKey: row.storage_key,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
    isActive: Boolean(row.is_active)
  };
}
