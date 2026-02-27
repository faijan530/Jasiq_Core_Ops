export async function insertExpensePayment(client, row) {
  const res = await client.query(
    `INSERT INTO expense_payment (
       id,
       expense_id,
       paid_amount,
       paid_at,
       method,
       reference_id,
       created_at,
       created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
     RETURNING *`,
    [row.id, row.expense_id, row.paid_amount, row.paid_at, row.method, row.reference_id, row.created_by]
  );
  return res.rows[0];
}

export async function listExpensePayments(client, { expenseId }) {
  const res = await client.query(
    `SELECT *
     FROM expense_payment
     WHERE expense_id = $1
     ORDER BY paid_at DESC, id DESC`,
    [expenseId]
  );
  return res.rows;
}

export async function sumExpensePayments(client, { expenseId }) {
  const res = await client.query(
    `SELECT COALESCE(SUM(paid_amount), 0)::numeric AS total
     FROM expense_payment
     WHERE expense_id = $1`,
    [expenseId]
  );
  return res.rows[0]?.total ?? 0;
}
