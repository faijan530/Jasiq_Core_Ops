export async function insertLeaveAttachment(client, row) {
  const res = await client.query(
    `INSERT INTO leave_attachment (
       id,
       leave_request_id,
       file_name,
       mime_type,
       size_bytes,
       storage_key,
       uploaded_at,
       uploaded_by
     ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
     RETURNING *`,
    [
      row.id,
      row.leave_request_id,
      row.file_name,
      row.mime_type,
      row.size_bytes,
      row.storage_key,
      row.uploaded_by
    ]
  );
  return res.rows[0];
}

export async function listLeaveAttachments(client, { leaveRequestId }) {
  const res = await client.query(
    `SELECT
       id,
       leave_request_id,
       file_name,
       mime_type,
       size_bytes,
       storage_key,
       uploaded_at,
       uploaded_by
     FROM leave_attachment
     WHERE leave_request_id = $1
     ORDER BY uploaded_at DESC, id DESC`,
    [leaveRequestId]
  );
  return res.rows;
}

export async function getLeaveAttachment(client, { leaveRequestId, attId }) {
  const res = await client.query(
    `SELECT
       id,
       leave_request_id,
       file_name,
       mime_type,
       size_bytes,
       storage_key,
       uploaded_at,
       uploaded_by
     FROM leave_attachment
     WHERE leave_request_id = $1 AND id = $2`,
    [leaveRequestId, attId]
  );
  return res.rows[0] || null;
}
