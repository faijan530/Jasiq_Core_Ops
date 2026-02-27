export async function insertExpenseReceipt(client, row) {
  const res = await client.query(
    `INSERT INTO expense_receipt (
       id,
       expense_id,
       file_name,
       content_type,
       file_size,
       storage_key,
       uploaded_at,
       uploaded_by,
       is_active
     ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,true)
     RETURNING *`,
    [row.id, row.expense_id, row.file_name, row.content_type, row.file_size, row.storage_key, row.uploaded_by]
  );
  return res.rows[0];
}

export async function listExpenseReceipts(client, { expenseId }) {
  const res = await client.query(
    `SELECT *
     FROM expense_receipt
     WHERE expense_id = $1 AND is_active = true
     ORDER BY uploaded_at DESC, id DESC`,
    [expenseId]
  );
  return res.rows;
}

export async function getExpenseReceipt(client, { expenseId, receiptId }) {
  const res = await client.query(
    `SELECT *
     FROM expense_receipt
     WHERE expense_id = $1 AND id = $2 AND is_active = true`,
    [expenseId, receiptId]
  );
  return res.rows[0] || null;
}
