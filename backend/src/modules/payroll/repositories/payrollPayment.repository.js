export async function insertPayrollPayment(client, row) {
  const res = await client.query(
    `INSERT INTO payroll_payment (
       id,
       payroll_run_id,
       employee_id,
       paid_amount,
       paid_at,
       method,
       reference_id,
       created_at,
       created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)
     RETURNING *`,
    [
      row.id,
      row.payroll_run_id,
      row.employee_id,
      row.paid_amount,
      row.paid_at,
      row.method,
      row.reference_id,
      row.created_by
    ]
  );
  return res.rows[0] || null;
}

export async function listPaymentsByRun(client, { payrollRunId }) {
  const res = await client.query(
    `SELECT *
     FROM payroll_payment
     WHERE payroll_run_id = $1
     ORDER BY paid_at DESC, id DESC`,
    [payrollRunId]
  );
  return res.rows;
}

export async function listPaymentsByRunEmployee(client, { payrollRunId, employeeId }) {
  const res = await client.query(
    `SELECT *
     FROM payroll_payment
     WHERE payroll_run_id = $1 AND employee_id = $2
     ORDER BY paid_at DESC, id DESC`,
    [payrollRunId, employeeId]
  );
  return res.rows;
}

export async function sumPaymentsByEmployee(client, { payrollRunId, employeeId }) {
  const res = await client.query(
    `SELECT COALESCE(SUM(paid_amount),0)::numeric AS total
     FROM payroll_payment
     WHERE payroll_run_id = $1 AND employee_id = $2`,
    [payrollRunId, employeeId]
  );
  return res.rows[0]?.total || '0';
}
