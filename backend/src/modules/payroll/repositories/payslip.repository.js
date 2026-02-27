export async function insertPayslip(client, row) {
  const res = await client.query(
    `INSERT INTO payslip (
       id,
       payroll_run_id,
       employee_id,
       payslip_number,
       month,
       gross,
       total_adjustments,
       total_deductions,
       net,
       payment_status,
       snapshot,
       pdf_path,
       storage_key,
       file_name,
       content_type,
       file_size,
       generated_at,
       generated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (payroll_run_id, employee_id) DO UPDATE SET
       payslip_number = COALESCE(payslip.payslip_number, EXCLUDED.payslip_number),
       month = EXCLUDED.month,
       gross = EXCLUDED.gross,
       total_adjustments = EXCLUDED.total_adjustments,
       total_deductions = EXCLUDED.total_deductions,
       net = EXCLUDED.net,
       payment_status = EXCLUDED.payment_status,
       snapshot = EXCLUDED.snapshot,
       pdf_path = EXCLUDED.pdf_path,
       storage_key = EXCLUDED.storage_key,
       file_name = EXCLUDED.file_name,
       content_type = EXCLUDED.content_type,
       file_size = EXCLUDED.file_size,
       generated_at = EXCLUDED.generated_at,
       generated_by = EXCLUDED.generated_by
     RETURNING *`,
    [
      row.id,
      row.payroll_run_id,
      row.employee_id,
      row.payslip_number,
      row.month,
      row.gross,
      row.total_adjustments,
      row.total_deductions,
      row.net,
      row.payment_status,
      row.snapshot ? JSON.stringify(row.snapshot) : null,
      row.pdf_path,
      row.storage_key,
      row.file_name,
      row.content_type,
      row.file_size,
      row.generated_at,
      row.generated_by
    ]
  );
  return res.rows[0] || null;
}

export async function getPayslipByRunEmployee(client, { payrollRunId, employeeId }) {
  const res = await client.query(
    'SELECT * FROM payslip WHERE payroll_run_id = $1 AND employee_id = $2',
    [payrollRunId, employeeId]
  );
  return res.rows[0] || null;
}

export async function getMaxPayslipSequenceForMonth(client, { year, month }) {
  const ym = `${String(year)}-${String(month).padStart(2, '0')}`;
  const prefix = `PSL-${ym}-`;
  const res = await client.query(
    `SELECT COALESCE(
        MAX(CAST(RIGHT(payslip_number, 4) AS INT)),
        0
      )::int AS max_seq
     FROM payslip
     WHERE payslip_number LIKE $1`,
    [`${prefix}%`]
  );
  return res.rows[0]?.max_seq ?? 0;
}

export async function getPayslipById(client, { id }) {
  const res = await client.query('SELECT * FROM payslip WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getEmployeeIdByUserId(client, { userId }) {
  const res = await client.query('SELECT employee_id FROM "user" WHERE id = $1', [userId]);
  return res.rows[0]?.employee_id || null;
}

export async function listPayslipsByRun(client, { payrollRunId }) {
  const res = await client.query(
    `SELECT *
     FROM payslip
     WHERE payroll_run_id = $1
     ORDER BY employee_id ASC`,
    [payrollRunId]
  );
  return res.rows;
}

export async function listPayslipsByEmployee(client, { employeeId }) {
  const res = await client.query(
    `SELECT
       id,
       to_char(month, 'YYYY-MM') AS month,
       gross,
       total_deductions,
       net,
       payment_status,
       generated_at
     FROM payslip
     WHERE employee_id = $1
     ORDER BY month DESC, generated_at DESC`,
    [employeeId]
  );
  return res.rows;
}
