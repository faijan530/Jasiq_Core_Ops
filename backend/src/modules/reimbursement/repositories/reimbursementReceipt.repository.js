export async function insertReimbursementReceipt(client, row) {
  const res = await client.query(
    `INSERT INTO reimbursement_receipt (
      id,
      reimbursement_id,
      file_name,
      content_type,
      file_size,
      storage_key,
      uploaded_at,
      uploaded_by,
      is_active
    ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,true)
    RETURNING *`,
    [row.id, row.reimbursement_id, row.file_name, row.content_type, row.file_size, row.storage_key, row.uploaded_by]
  );
  return res.rows[0];
}

export async function listReimbursementReceipts(client, { reimbursementId }) {
  const res = await client.query(
    `SELECT *
     FROM reimbursement_receipt
     WHERE reimbursement_id = $1 AND is_active = true
     ORDER BY uploaded_at DESC, id DESC`,
    [reimbursementId]
  );
  return res.rows;
}

export async function getReimbursementReceipt(client, { reimbursementId, receiptId }) {
  const res = await client.query(
    `SELECT *
     FROM reimbursement_receipt
     WHERE reimbursement_id = $1 AND id = $2`,
    [reimbursementId, receiptId]
  );
  return res.rows[0] || null;
}

export async function deactivateReceipt(client, { reimbursementId, receiptId, actorId }) {
  const res = await client.query(
    `UPDATE reimbursement_receipt
     SET is_active = false
     WHERE reimbursement_id = $1 AND id = $2
     RETURNING *`,
    [reimbursementId, receiptId]
  );
  return res.rows[0] || null;
}
