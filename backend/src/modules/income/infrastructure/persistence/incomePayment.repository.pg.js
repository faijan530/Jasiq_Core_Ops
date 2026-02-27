export async function insertIncomePayment(client, row) {
  const res = await client.query(
    `INSERT INTO income_payment (
       id,
       income_id,
       paid_amount,
       paid_at,
       method,
       reference_id,
       created_at,
       created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
     RETURNING *`,
    [row.id, row.income_id, row.paid_amount, row.paid_at, row.method, row.reference_id, row.created_by]
  );
  return res.rows[0];
}

export async function listIncomePayments(client, { incomeId }) {
  const res = await client.query(
    `SELECT *
     FROM income_payment
     WHERE income_id = $1
     ORDER BY paid_at DESC, id DESC`,
    [incomeId]
  );
  return res.rows;
}

export async function sumIncomePayments(client, { incomeId }) {
  const res = await client.query(
    `SELECT COALESCE(SUM(paid_amount), 0)::numeric AS total
     FROM income_payment
     WHERE income_id = $1`,
    [incomeId]
  );
  return res.rows[0]?.total ?? 0;
}
