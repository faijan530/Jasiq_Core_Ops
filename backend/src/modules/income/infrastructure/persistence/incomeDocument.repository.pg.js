export async function insertIncomeDocument(client, row) {
  const res = await client.query(
    `INSERT INTO income_document (
       id,
       income_id,
       file_name,
       content_type,
       file_size,
       storage_key,
       uploaded_at,
       uploaded_by,
       is_active
     ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,true)
     RETURNING *`,
    [row.id, row.income_id, row.file_name, row.content_type, row.file_size, row.storage_key, row.uploaded_by]
  );
  return res.rows[0];
}

export async function listIncomeDocuments(client, { incomeId }) {
  const res = await client.query(
    `SELECT *
     FROM income_document
     WHERE income_id = $1 AND is_active = true
     ORDER BY uploaded_at DESC, id DESC`,
    [incomeId]
  );
  return res.rows;
}

export async function getIncomeDocument(client, { incomeId, docId }) {
  const res = await client.query(
    `SELECT *
     FROM income_document
     WHERE income_id = $1 AND id = $2`,
    [incomeId, docId]
  );
  return res.rows[0] || null;
}
