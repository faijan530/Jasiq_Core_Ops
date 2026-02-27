export async function insertReimbursementPayment(client, row) {
  const res = await client.query(
    `INSERT INTO reimbursement_payment (
      id,
      reimbursement_id,
      paid_amount,
      paid_at,
      method,
      reference_id,
      note,
      created_at,
      created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)
    RETURNING *`,
    [
      row.id,
      row.reimbursement_id,
      row.paid_amount,
      row.paid_at,
      row.method,
      row.reference_id,
      row.note,
      row.created_by
    ]
  );
  return res.rows[0];
}

export async function sumReimbursementPayments(client, { reimbursementId }) {
  const res = await client.query(
    `SELECT COALESCE(SUM(paid_amount), 0)::numeric AS total
     FROM reimbursement_payment
     WHERE reimbursement_id = $1`,
    [reimbursementId]
  );
  return Number(res.rows[0]?.total || 0);
}

export async function listReimbursementPayments(client, { reimbursementId, offset, limit }) {
  const res = await client.query(
    `SELECT *
     FROM reimbursement_payment
     WHERE reimbursement_id = $1
     ORDER BY paid_at DESC, id DESC
     OFFSET $2 LIMIT $3`,
    [reimbursementId, offset, limit]
  );
  return res.rows;
}

export async function countReimbursementPayments(client, { reimbursementId }) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM reimbursement_payment
     WHERE reimbursement_id = $1`,
    [reimbursementId]
  );
  return res.rows[0].c;
}
